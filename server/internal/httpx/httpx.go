// Package httpx holds JSON/HTTP helpers shared by all handlers.
package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"strings"
)

const maxJSONBody = 1 << 20

type Error struct {
	Status  int               `json:"-"`
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func NewError(status int, code, msg string) *Error {
	return &Error{Status: status, Code: code, Message: msg}
}

func Validation(fields map[string]string) *Error {
	return &Error{Status: http.StatusUnprocessableEntity, Code: "validation_failed", Message: "Some fields are invalid.", Fields: fields}
}

var (
	ErrNotFound     = NewError(http.StatusNotFound, "not_found", "Resource not found.")
	ErrUnauthorized = NewError(http.StatusUnauthorized, "unauthorized", "Login required.")
)

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Fail(w http.ResponseWriter, err error) {
	var e *Error
	if !errors.As(err, &e) {
		slog.Error("internal error", "err", err)
		e = NewError(http.StatusInternalServerError, "internal", "Something went wrong.")
	}
	WriteJSON(w, e.Status, map[string]*Error{"error": e})
}

func DecodeJSON(r *http.Request, dst any) error {
	mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if mt != "application/json" {
		return NewError(http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json.")
	}
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, maxJSONBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			return NewError(http.StatusRequestEntityTooLarge, "too_large", "Request body too large.")
		}
		return NewError(http.StatusBadRequest, "bad_json", "Malformed JSON body.")
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		return NewError(http.StatusBadRequest, "bad_json", "Malformed JSON body.")
	}
	return nil
}

func ClientIP(r *http.Request, trusted *net.IPNet) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	if ip := net.ParseIP(host); ip != nil && trusted != nil && trusted.Contains(ip) {
		parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
		for i := len(parts) - 1; i >= 0; i-- {
			p := net.ParseIP(strings.TrimSpace(parts[i]))
			if p != nil && !trusted.Contains(p) {
				return p.String()
			}
		}
	}
	return host
}

const csp = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
	"font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Content-Security-Policy", csp)
		next.ServeHTTP(w, r)
	})
}

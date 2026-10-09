// Package auth holds authentication primitives: password hashing, secret
// encryption, admin bootstrap, sessions and recovery codes.
package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"math/big"

	"golang.org/x/crypto/bcrypt"
)

// BcryptCost is the bcrypt work factor; tests lower it for speed.
var BcryptCost = 12

const recoveryAlphabet = "abcdefghjkmnpqrstuvwxyz23456789"

// HashPassword returns a bcrypt hash of pw.
func HashPassword(pw string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(pw), BcryptCost)
	return string(h), err
}

// CheckPassword reports whether pw matches the bcrypt hash.
func CheckPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

// Encrypt seals plaintext with AES-256-GCM; the random nonce prefixes the result.
func Encrypt(key, plaintext []byte) ([]byte, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// Decrypt opens a blob produced by Encrypt.
func Decrypt(key, blob []byte) ([]byte, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	n := gcm.NonceSize()
	if len(blob) < n {
		return nil, errors.New("ciphertext too short")
	}
	return gcm.Open(nil, blob[:n], blob[n:], nil)
}

func newGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// RandomToken returns n random bytes as unpadded base64url.
func RandomToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err) // crypto/rand failure is unrecoverable
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// SHA256Hex returns the hex sha256 of s.
func SHA256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

// NewRecoveryCodes returns 8 unique xxxx-xxxx codes and their sha256 hashes.
func NewRecoveryCodes() (plain []string, hashes []string) {
	seen := map[string]bool{}
	for len(plain) < 8 {
		c := randomCode()
		if seen[c] {
			continue
		}
		seen[c] = true
		plain = append(plain, c)
		hashes = append(hashes, SHA256Hex(c))
	}
	return plain, hashes
}

func randomCode() string {
	max := big.NewInt(int64(len(recoveryAlphabet)))
	b := make([]byte, 0, 9)
	for i := 0; i < 8; i++ {
		if i == 4 {
			b = append(b, '-')
		}
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			panic(err)
		}
		b = append(b, recoveryAlphabet[n.Int64()])
	}
	return string(b)
}

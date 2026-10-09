package auth

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
)

func init() { BcryptCost = 4 }

func TestEncryptRoundTripAndTamper(t *testing.T) {
	key := bytes.Repeat([]byte{7}, 32)
	blob, err := Encrypt(key, []byte("JBSWY3DPEHPK3PXP"))
	if err != nil {
		t.Fatal(err)
	}
	got, err := Decrypt(key, blob)
	if err != nil || string(got) != "JBSWY3DPEHPK3PXP" {
		t.Fatalf("%q %v", got, err)
	}
	blob[len(blob)-1] ^= 1
	if _, err := Decrypt(key, blob); err == nil {
		t.Fatal("tampered ciphertext must fail")
	}
}

func TestPassword(t *testing.T) {
	h, _ := HashPassword("correct horse battery")
	if !CheckPassword(h, "correct horse battery") || CheckPassword(h, "wrong") {
		t.Fatal("password check broken")
	}
}

func TestRecoveryCodes(t *testing.T) {
	plain, hashes := NewRecoveryCodes()
	re := regexp.MustCompile(`^[a-z2-9]{4}-[a-z2-9]{4}$`)
	if len(plain) != 8 || len(hashes) != 8 {
		t.Fatal("want 8")
	}
	seen := map[string]bool{}
	for i, c := range plain {
		if !re.MatchString(c) || seen[c] || hashes[i] != SHA256Hex(c) || strings.ContainsAny(c, "01lio") {
			t.Fatalf("bad code %q", c)
		}
		seen[c] = true
	}
}

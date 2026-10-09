package validate

import "testing"

func TestSlug(t *testing.T) {
	for _, ok := range []string{"a", "kanban", "iron-coach-th", "a1-b2"} {
		if Slug(ok) != "" {
			t.Errorf("%q should be valid", ok)
		}
	}
	for _, bad := range []string{"", "A", "-a", "a-", "a--b", "a b", "ก", string(make([]byte, 81))} {
		if Slug(bad) == "" {
			t.Errorf("%q should be invalid", bad)
		}
	}
}

func TestURLAndTags(t *testing.T) {
	if URL("") != "" || URL("https://x.y") != "" || URL("javascript:alert(1)") == "" || URL("ftp://x") == "" {
		t.Fatal("url rules")
	}
	long := make([]string, 13)
	if Tags(long) == "" || Tags([]string{string(make([]byte, 33))}) == "" || Tags([]string{"Go"}) != "" || Tags([]string{" "}) == "" {
		t.Fatal("tag rules")
	}
}

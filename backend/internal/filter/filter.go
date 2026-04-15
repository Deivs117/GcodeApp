package filter

import "strings"

// FilterLine returns (keep bool, wasFiltered bool)
func FilterLine(line string, filterM0M6 bool) (keep bool, wasFiltered bool) {
	if !filterM0M6 {
		return true, false
	}
	trimmed := strings.TrimSpace(strings.ToUpper(line))
	fields := strings.Fields(trimmed)
	if len(fields) > 0 {
		cmd := fields[0]
		if cmd == "M0" || cmd == "M6" {
			return false, true
		}
	}
	return true, false
}

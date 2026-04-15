package filter

import "testing"

func TestFilterLine_NoFilter(t *testing.T) {
	keep, filtered := FilterLine("M0 ; pause", false)
	if !keep || filtered {
		t.Error("expected keep=true, filtered=false when filter disabled")
	}
}

func TestFilterLine_M0(t *testing.T) {
	keep, filtered := FilterLine("M0", true)
	if keep || !filtered {
		t.Error("M0 should be filtered")
	}
}

func TestFilterLine_M0WithComment(t *testing.T) {
	keep, filtered := FilterLine("M0 ; pause here", true)
	if keep || !filtered {
		t.Error("M0 with comment should be filtered")
	}
}

func TestFilterLine_M6(t *testing.T) {
	keep, filtered := FilterLine("M6 T1", true)
	if keep || !filtered {
		t.Error("M6 should be filtered")
	}
}

func TestFilterLine_M03NotFiltered(t *testing.T) {
	keep, filtered := FilterLine("M03 S1000", true)
	if !keep || filtered {
		t.Error("M03 must NOT be filtered")
	}
}

func TestFilterLine_M04NotFiltered(t *testing.T) {
	keep, filtered := FilterLine("M04", true)
	if !keep || filtered {
		t.Error("M04 must NOT be filtered")
	}
}

func TestFilterLine_M06NotFiltered(t *testing.T) {
	// M06 != M6 in strict tokenization, so it should NOT be filtered
	keep, filtered := FilterLine("M06 T2", true)
	if !keep || filtered {
		t.Error("M06 must NOT be filtered (only M6 is exact)")
	}
}

func TestFilterLine_EmptyLine(t *testing.T) {
	keep, filtered := FilterLine("", true)
	if !keep || filtered {
		t.Error("empty line should be kept")
	}
}

func TestFilterLine_NormalGcode(t *testing.T) {
	keep, filtered := FilterLine("G00 X10 Y20 Z5", true)
	if !keep || filtered {
		t.Error("normal gcode should be kept")
	}
}

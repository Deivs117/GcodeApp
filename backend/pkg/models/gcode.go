package models

// ProcessRequest holds the uploaded files and options for processing.
type ProcessRequest struct {
	Files      []GcodeFile
	FilterM0M6 bool
}

// GcodeFile represents a single G-Code file with its content.
type GcodeFile struct {
	Name    string
	Content []byte
}

// ProcessResult holds the merged output and stats.
type ProcessResult struct {
	Output        string `json:"output"`
	TotalLines    int    `json:"totalLines"`
	FilteredLines int    `json:"filteredLines"`
	FileName      string `json:"fileName"`
}

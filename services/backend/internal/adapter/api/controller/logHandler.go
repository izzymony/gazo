package controller

import (
	"bufio"
	"compress/gzip"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"insta-api/internal/helper"
)

type LogController struct{}

func NewLogController() *LogController {
	return &LogController{}
}

func (l *LogController) TailLogHandler(c *gin.Context) {
	query := c.Query("search")
	sizeStr := c.Query("size")
	archived := c.Query("archived")

	size, err := strconv.Atoi(sizeStr)
	if err != nil || size <= 0 {
		size = 10000
	}

	var logs []string
	var logFiles []string

	if archived == "true" {
		logFiles, _ = filepath.Glob(helper.LogDir + "*.gz")
	} else {
		logFiles = append(logFiles, helper.LogFile)
	}

	for _, file := range logFiles {
		entries, err := readLogFile(file, query, size)
		if err == nil {
			logs = append(logs, entries...)
		}
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

func readLogFile(filename, pattern string, size int) ([]string, error) {
	var file *os.File
	var err error
	var scanner *bufio.Scanner
	var matchedLogs []string

	if strings.HasSuffix(filename, ".gz") {
		file, err = os.Open(filename)
		if err != nil {
			return nil, err
		}
		defer file.Close()

		gzReader, err := gzip.NewReader(file)
		if err != nil {
			return nil, err
		}
		defer gzReader.Close()

		scanner = bufio.NewScanner(gzReader)
	} else {
		file, err = os.Open(filename)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		scanner = bufio.NewScanner(file)
	}

	regex, _ := regexp.Compile(pattern)

	for scanner.Scan() {
		line := scanner.Text()
		if pattern == "" || regex.MatchString(line) {
			matchedLogs = append(matchedLogs, line)
			if len(matchedLogs) >= size {
				break
			}
		}
	}

	return matchedLogs, nil
}

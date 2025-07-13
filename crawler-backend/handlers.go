package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UrlInput — структура для приёма данных при добавлении URL
type UrlInput struct {
	Url string `json:"url" binding:"required,url"`
}

// UrlResponse — структура для отдачи url и его данных
type UrlResponse struct {
	ID              int          `json:"id"`
	Url             string       `json:"url"`
	Status          string       `json:"status"`
	HTMLVersion     string       `json:"html_version"`
	Title           string       `json:"title"`
	H1Count         int          `json:"h1_count"`
	H2Count         int          `json:"h2_count"`
	H3Count         int          `json:"h3_count"`
	H4Count         int          `json:"h4_count"`
	H5Count         int          `json:"h5_count"`
	H6Count         int          `json:"h6_count"`
	InternalLinks   int          `json:"internal_links"`
	ExternalLinks   int          `json:"external_links"`
	BrokenLinks     int          `json:"broken_links"`
	HasLoginForm    bool         `json:"has_login_form"`
	CreatedAt       string       `json:"created_at"`
	BrokenLinksList []BrokenLink `json:"broken_links_list"` // структура берётся из crawler.go
}

// getBrokenLinks — вспомогательная функция для получения битых ссылок по url_id
func getBrokenLinks(urlID int) ([]BrokenLink, error) {
	rows, err := DB.Query("SELECT broken_url, status_code FROM broken_links WHERE url_id = ?", urlID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brokenLinks []BrokenLink
	for rows.Next() {
		var bl BrokenLink
		if err := rows.Scan(&bl.BrokenURL, &bl.StatusCode); err != nil {
			continue
		}
		brokenLinks = append(brokenLinks, bl)
	}
	return brokenLinks, nil
}

// AddUrlHandler добавляет новый URL в базу со статусом queued
func AddUrlHandler(c *gin.Context) {
	var input UrlInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	res, err := DB.Exec("INSERT INTO urls (url, status) VALUES (?, 'queued')", input.Url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	id, _ := res.LastInsertId()
	c.JSON(http.StatusOK, gin.H{"message": "URL added", "id": id})
}

// GetUrlsHandler возвращает список всех URL с данными, включая битые ссылки
func GetUrlsHandler(c *gin.Context) {
	rows, err := DB.Query(`
		SELECT id, url, status, html_version, title,
		       h1_count, h2_count, h3_count, h4_count, h5_count, h6_count,
		       internal_links, external_links, broken_links, has_login_form, created_at
		FROM urls ORDER BY id DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var urls []UrlResponse
	for rows.Next() {
		var u UrlResponse
		var hasLoginForm int
		err := rows.Scan(&u.ID, &u.Url, &u.Status, &u.HTMLVersion, &u.Title,
			&u.H1Count, &u.H2Count, &u.H3Count, &u.H4Count, &u.H5Count, &u.H6Count,
			&u.InternalLinks, &u.ExternalLinks, &u.BrokenLinks, &hasLoginForm, &u.CreatedAt)
		if err != nil {
			continue
		}
		u.HasLoginForm = hasLoginForm != 0

		brokenLinks, err := getBrokenLinks(u.ID)
		if err == nil {
			u.BrokenLinksList = brokenLinks
		}

		urls = append(urls, u)
	}

	c.JSON(http.StatusOK, urls)
}

// GetUrlByIDHandler возвращает данные конкретного URL по id, включая битые ссылки
func GetUrlByIDHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var u UrlResponse
	var hasLoginForm int

	err = DB.QueryRow(`
		SELECT id, url, status, html_version, title,
		       h1_count, h2_count, h3_count, h4_count, h5_count, h6_count,
		       internal_links, external_links, broken_links, has_login_form, created_at
		FROM urls WHERE id = ?`, id).
		Scan(&u.ID, &u.Url, &u.Status, &u.HTMLVersion, &u.Title,
			&u.H1Count, &u.H2Count, &u.H3Count, &u.H4Count, &u.H5Count, &u.H6Count,
			&u.InternalLinks, &u.ExternalLinks, &u.BrokenLinks, &hasLoginForm, &u.CreatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
		return
	}
	u.HasLoginForm = hasLoginForm != 0

	brokenLinks, err := getBrokenLinks(u.ID)
	if err == nil {
		u.BrokenLinksList = brokenLinks
	}

	c.JSON(http.StatusOK, u)
}

// DeleteUrlHandler удаляет URL из базы по id
func DeleteUrlHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	res, err := DB.Exec("DELETE FROM urls WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking rows affected"})
		return
	}
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "URL deleted"})
}

// RefreshUrlHandler обновляет статус URL по id (ставит queued для повторного обхода)
func RefreshUrlHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	res, err := DB.Exec("UPDATE urls SET status = 'queued' WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking rows affected"})
		return
	}
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "URL status refreshed"})
}

// StartUrlHandler ставит статус 'running' если URL в 'queued' или 'stopped'
func StartUrlHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	res, err := DB.Exec("UPDATE urls SET status = 'running' WHERE id = ? AND status IN ('queued', 'stopped')", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found or cannot be started"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "URL crawling started"})
}

// StopUrlHandler ставит статус 'stopped' если URL в 'running'
func StopUrlHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	res, err := DB.Exec("UPDATE urls SET status = 'stopped' WHERE id = ? AND status = 'running'", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found or not running"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "URL crawling stopped"})
}

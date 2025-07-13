package main

import (
	"context"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)

type BrokenLink struct {
	BrokenURL  string `json:"broken_url"`
	StatusCode int    `json:"status_code"`
}

type AnalysisResult struct {
	HTMLVersion     string
	Title           string
	HeadingsCount   map[string]int
	InternalLinks   int
	ExternalLinks   int
	BrokenLinks     int
	BrokenLinksList []BrokenLink
	HasLoginForm    bool
}

var httpClient = &http.Client{
	Timeout: 5 * time.Second,
}

const maxConcurrentChecks = 10

// --- Добавляем глобальные переменные для старт-стопа ---
var (
	crawlCtx    context.Context
	crawlCancel context.CancelFunc
	crawlWg     sync.WaitGroup
)

// StartCrawling запускает цикл обработки queued url в отдельной горутине
func StartCrawling() {
	if crawlCancel != nil {
		log.Println("Crawler already running")
		return
	}

	crawlCtx, crawlCancel = context.WithCancel(context.Background())
	crawlWg.Add(1)

	go func() {
		defer crawlWg.Done()
		for {
			select {
			case <-crawlCtx.Done():
				log.Println("Crawling stopped")
				return
			default:
				processQueuedURLs(crawlCtx)
				time.Sleep(10 * time.Second) // пауза между циклами
			}
		}
	}()

	log.Println("Crawling started")
}

// StopCrawling корректно останавливает краулер
func StopCrawling() {
	if crawlCancel == nil {
		log.Println("Crawler is not running")
		return
	}
	crawlCancel()
	crawlWg.Wait()
	crawlCancel = nil
	log.Println("Crawler fully stopped")
}

// processQueuedURLs выбирает queued URL из базы и запускает обработку
func processQueuedURLs(ctx context.Context) {
	rows, err := DB.Query("SELECT id, url FROM urls WHERE status = 'queued'")
	if err != nil {
		log.Println("Error selecting queued urls:", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		select {
		case <-ctx.Done():
			log.Println("processQueuedURLs cancelled")
			return
		default:
			var id int
			var url string
			if err := rows.Scan(&id, &url); err != nil {
				log.Println("Row scan error:", err)
				continue
			}
			processUrl(id, url)
		}
	}
}

// processUrl загружает страницу, анализирует и сохраняет результаты
func processUrl(id int, url string) {
	log.Printf("Starting processing url: %s", url)
	updateStatus(id, "running")

	resp, err := httpClient.Get(url)
	if err != nil {
		log.Println("Request error:", err)
		updateStatus(id, "error")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Println("Response error:", resp.Status)
		updateStatus(id, "error")
		return
	}

	doc, err := html.Parse(resp.Body)
	if err != nil {
		log.Println("HTML parsing failed:", err)
		updateStatus(id, "error")
		return
	}

	result := analyzeHTML(doc, url)

	_, err = DB.Exec(
		`UPDATE urls SET 
			status = ?, 
			html_version = ?, 
			title = ?, 
			h1_count = ?, 
			h2_count = ?, 
			h3_count = ?, 
			h4_count = ?, 
			h5_count = ?, 
			h6_count = ?, 
			internal_links = ?, 
			external_links = ?, 
			broken_links = ?, 
			has_login_form = ?
		WHERE id = ?`,
		"done",
		result.HTMLVersion,
		result.Title,
		result.HeadingsCount["h1"],
		result.HeadingsCount["h2"],
		result.HeadingsCount["h3"],
		result.HeadingsCount["h4"],
		result.HeadingsCount["h5"],
		result.HeadingsCount["h6"],
		result.InternalLinks,
		result.ExternalLinks,
		result.BrokenLinks,
		result.HasLoginForm,
		id,
	)

	if err != nil {
		log.Println("Failed to save analysis results:", err)
	}

	_, err = DB.Exec("DELETE FROM broken_links WHERE url_id = ?", id)
	if err != nil {
		log.Println("Failed to delete old broken links:", err)
	}

	for _, bl := range result.BrokenLinksList {
		_, err := DB.Exec("INSERT INTO broken_links (url_id, broken_url, status_code) VALUES (?, ?, ?)", id, bl.BrokenURL, bl.StatusCode)
		if err != nil {
			log.Println("Failed to insert broken link:", err)
		}
	}

	log.Printf("Processing finished: %s", url)
}

func updateStatus(id int, status string) {
	_, err := DB.Exec("UPDATE urls SET status = ? WHERE id = ?", status, id)
	if err != nil {
		log.Println("Status updating failed:", err)
	}
}

func analyzeHTML(doc *html.Node, baseURL string) AnalysisResult {
	result := AnalysisResult{
		HeadingsCount: make(map[string]int),
	}

	for c := doc.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.DoctypeNode {
			doctype := strings.ToLower(c.Data)
			switch {
			case strings.Contains(doctype, "html"):
				result.HTMLVersion = "HTML5"
			case strings.Contains(doctype, "xhtml"):
				result.HTMLVersion = "XHTML"
			default:
				result.HTMLVersion = "Unknown"
			}
			break
		}
	}

	sem := make(chan struct{}, maxConcurrentChecks)
	var wg sync.WaitGroup
	var mu sync.Mutex

	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "title":
				if n.FirstChild != nil {
					result.Title = n.FirstChild.Data
				}
			case "h1", "h2", "h3", "h4", "h5", "h6":
				result.HeadingsCount[n.Data]++
			case "a":
				for _, attr := range n.Attr {
					if attr.Key == "href" {
						link := attr.Val
						if strings.HasPrefix(link, "http") || strings.HasPrefix(link, "https") {
							if strings.HasPrefix(link, baseURL) {
								result.InternalLinks++
							} else {
								result.ExternalLinks++
							}

							wg.Add(1)
							sem <- struct{}{}
							go func(url string) {
								defer wg.Done()
								defer func() { <-sem }()
								status := getStatusCode(url)
								if status >= 400 || status == 0 {
									mu.Lock()
									result.BrokenLinks++
									result.BrokenLinksList = append(result.BrokenLinksList, BrokenLink{
										BrokenURL:  url,
										StatusCode: status,
									})
									mu.Unlock()
								}
							}(link)

						} else {
							result.InternalLinks++
						}
					}
				}
			case "form":
				for _, attr := range n.Attr {
					valLower := strings.ToLower(attr.Val)
					if attr.Key == "action" && strings.Contains(valLower, "login") {
						result.HasLoginForm = true
					}
					if attr.Key == "id" && strings.Contains(valLower, "login") {
						result.HasLoginForm = true
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)

	wg.Wait()
	return result
}

func getStatusCode(url string) int {
	req, err := http.NewRequest("HEAD", url, nil)
	if err != nil {
		return 0
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	return resp.StatusCode
}

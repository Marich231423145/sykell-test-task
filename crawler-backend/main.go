package main

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

func CrawlWorker() {
	for {
		StartCrawling()
		time.Sleep(10 * time.Second) // пауза между проверками
	}
}

func main() {
	InitDB()

	// Запускаем краулер в фоне циклически
	go CrawlWorker()

	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// Публичный маршрут без авторизации
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// Группа маршрутов с авторизацией
	authorized := r.Group("/", AuthMiddleware())
	{
		authorized.POST("/urls", AddUrlHandler)
		authorized.GET("/urls", GetUrlsHandler)
		authorized.GET("/urls/:id", GetUrlByIDHandler)
		authorized.DELETE("/urls/:id", DeleteUrlHandler)
		authorized.POST("/urls/:id/refresh", RefreshUrlHandler)
		authorized.PUT("/urls/:id/start", StartUrlHandler)
		authorized.PUT("/urls/:id/stop", StopUrlHandler)
	}

	log.Println("Server running on :8080")
	r.Run(":8080")
}

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() {
	dsn := "root:Marikayrik04@tcp(127.0.0.1:3306)/crawler_db"
	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error with connecting:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Ping error in MySQL:", err)
	}

	fmt.Println("Database connected!")
}

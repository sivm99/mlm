package envcheck

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func Init() {
	goEnv := os.Getenv("GO_ENV")
	if goEnv == "production" {
		log.Print(`Environment is production`)
		return
	}
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	log.Print(`All environment variables are loaded successfully!`)
}

.PHONY: install deploy configure-test deploy-test
.DEFAULT_GOAL := help

install: ## First time install
	npm install

deploy: ## Deploy to production
	git push heroku

configure-test: ## Configure test remote
	git remote add heroku-test https://git.heroku.com/commish-bot-test.git

deploy-test: ## Deploy to staging
	git push heroku-test

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'


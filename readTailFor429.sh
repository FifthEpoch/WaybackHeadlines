#!/bin/bash

check429() {
  gcloud app logs read --limit=10 | grep "429" ; grepres=$?
  if [[ $grepres -eq 0 ]]; then
    echo found n deploy
    gcloud app deploy --quiet
  elif [[ $grepres -eq 1 ]]; then
    echo not found
    sleep 5
    check429
  else
    echo Error
    sleep 5
    check429
  fi
}
sleep 30
check429




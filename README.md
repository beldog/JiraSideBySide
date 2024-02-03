# Jira Side by Side Chrome extension

This is a Chrome extension that helps the user to maintain activities in two separated Jira environments.
When a jira card is selected/opened in a called `remote` Jira environment then it looks for the associated Jira card in 
the `origin` Jira environment and, it shows its main details (key, summary, description, assignee, status and comments).

## How-to install

1. Open Chrome extensions view: 
	* Go to the "three dots" (top right corner)
	* Select "Extensions"
	* Enable "Developer mode" (top right corner)
	* Click on "Load unpacked"
	* Find the extension in your folder and click on "Select Folder"
2. If you want to see the extension in the top bar
	* Click on extensions's "Details" button
	* Enable "Pin to toolbar" option

## How-to use it

In order to see the results just need to open a new tab, or select an active one, and open any Jira issue
at the `remote` jira host. Once done, if exists any Jira issue related to the showing one then it will pull out the
information from `origin` Jira host and show main details.

---
author: https://github.com/beldog
date: 2024-02-03
---
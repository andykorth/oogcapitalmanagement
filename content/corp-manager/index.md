---
title: "Corporation Info Lookup"
language: en
featured_image: 'images/govt-office-narrow.png'
omit_header_text: true
type: page

summary: Lookup all companies in a corporation
description: Lookup all companies in a corporation
fullWidthArticle: true

tags: tool
---

# Corporation Info Lookup

This tool hits the FIO database for the specified corp, then loads each company in the corp. This tool is primarily used for corp leaders to track activity, and will hopefully improve once the new FIO is up, and we can access the new activity fields.

This tool is limited by a couple quirks of FIO. Companies are never removed from FIO. I mark them as inactive once users stop submitting corp data via the FIO plugin, which usually only happens when that account is deleted from the game due to inactivity. Pending ratings generally indicate the user fell back to a basic license. Planet counts in FIO record every planet on which the user has had a base. So these numbers may be unexpectedly high if a user swaps planets often. This can be fixed by having that user reset their data in FIO. 

Because this tool makes a ton of FIO requests, each company and corp is cached in your browser local storage. You may wish to clear that occasionally, but be kind to FIO. Requests to FIO originate from your local machine.

{{< corp-manager >}}


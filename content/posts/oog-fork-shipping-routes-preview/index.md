---
title: "OOG Fork Shipping Routes Preview"
date: 2026-10-23T20:00:00-04:00
draft: false
language: en
featured_image: images/oog-fork-shipping-routes-narrow.png
summary: A preview of new features available soon for shipping routes in the OOG Fork.
description: A preview of new features available soon for shipping routes in the OOG Fork.
author: Jackinabox
authorimage: images/jackinabox-author.png
accessCategories: Posts
tags: News
fullWidthArticle: true
---

Shipping routes are almost here! They are a very welcome, long-awaited, monumental shift in gameplay. Given its likely impact, many will have views and tools they develop to take advantage of the new feature. I wanted to share my thinking as a contribution to that discourse and what I'll be rolling out on the OOG fork that reflects it. As always, my deepest respect and thanks to Razenpok, the creator of Refined-PrUn, whose openness to our experimentation is deeply appreciated.

For those who haven't played with routes on the staging server, it's pretty wonky. One specifies specific amounts of goods for loading and unloading, destination waypoints with flight settings, and refueling. Given the number of materials flying to and from bases, this can get tedious, especially with more than one base on a route. Fortunately, we've modified ACT to support inputting route details.

<!-- TODO VIDEOS: ACT route input -->

But how much of what good should go to a base? Using XIT Burn, we know how much of a given material a base needs, so we can use that (times the number of days desired) to set the resupply load. Similarly, we know the output per day of a base, so we can guard against an output overloading the ship midroute. A new feature, ROUTECONFIG, allows a player to drag CXs and bases into a route and automatically set a bill of supply for them for a given period. The bill of supply is calculated as a "milk run": if a good needed by a later base is produced by an earlier one, that is reflected in the route configuration. One can automatically "fit" the number of supply days that a ship can carry given the various demands along the route.

<!-- TODO VIDEO: ROUTECONFIG -->

It's worth discussing **supply days** versus **route days.** As above, supply days are the number of days a base can be supported by the load on the ship. It is always equal across the bases on a route (no point dropping 10 days of supplies at one base and 5 at another on a preset route). Route days is the length of time it takes a ship to fly a route. One never wants supply days to be less than route days, or a base will run out of supplies waiting for the ship to reach it. In order to determine the route days for a proposed route in ROUTECONFIG, a player uses another new feature, XIT TRANSITS to test the route in BLU, which provides the count of route days, along with fuel demand, to ROUTECONFIG.

<!-- TODO VIDEO: XIT TRANSITS -->

If a player finds that more supply days fit in a route than the route days required for it, they can add additional bases and CX returns to the route until they have maximized the bases that can be supplied over the course of the route. For example, here is a route that supplies 12 bases with one ship.

<!-- TODO PICTURE: 12-base route -->

But how does one know what bases to put on what route? There is a new external tool to help with that, <http://profitableprun.com/star-map>. By using the COPY button in XIT BURN, one can import their empire and burn to a 3d star map that allows easy view of potential routes and can propose efficient routes for testing in game. If nothing else, it's a cool way to look at one's empire.

<!-- TODO VIDEO: star map -->

At this point, if someone wants to create an on-demand, non-automated route, it's now ready to be set up and launched through Refined PrUn. The player clicks assign in XIT ROUTEBURN, which opens a CX buy for any needed materials, then dispatches the designated ship on the route.

<!-- TODO PICTURE: XIT ROUTEBURN assign -->

The real power of shipping routes is automated, repeating routes though. We all want to go away for a week and have our empire operate on autopilot. A crucial nuance is that the game’s shipping routes do not include automatically buying needed goods at the commodity exchange. This means that for an automated, repeating route, players need to keep a stockpile at the commodity exchange in addition to the one already present at their base. One does not want to leave for the weekend and find that a route supporting several bases failed to fire on Saturday morning because needed materials were not in the warehouse at the route origin.

Buying such a stockpile is trivial, and I have a feature to do so over a restock period (ROUTESUPPLY), similar to the resupply period for burnact. Tracking the stockpile drawdown also isn’t particularly difficult, so in XIT ROUTEBURN, I have a separate countdown for each route origin: the days until the first departure that the stock at the origin can’t fully load.

<!-- TODO PICTURE: ROUTEBURN origin countdown -->

The challenge comes in making sure that one doesn’t accidentally sell, ship, or trade that buffer in the meantime. Given we don’t have containers, it just sits in an inventory, probably one's most frequently turned-over inventory, the CX. To protect that CX buffer, I have adjusted the CX Buy step in every action package except Route Restock itself (BURN, REPAIR, GOVBURN, DISPATCH and custom packages) to ignore the stockpile when calculating how much needs to be purchased for resupply, repair, etc. Also, I have created warnings on ACT MTRA steps and on contract fulfillment, if one tries to transfer stockpile goods. There’s also a new guard in CXPO if one is selling stockpiled goods. All of these are warnings players can dismiss; none of them are hard blocks. It’s a lot, but necessary if the dream of automated routes is to be realized in the current feature set.

Annoyingly, there is a bit of confusion to the term "loop" in the current in-game routes feature. Currently, if loop is toggled, it means that the route repeats. Generally, loop should mean that the route returns to the origin; a separate toggle to repeat the route would be appropriate for automated routes. Our new feature, ROUTECONFIG, handles this automatically so a route set in it, whether repeating or not, always returns to its origin. To have an automated route, just toggle loop.

Finally, we currently do a few wonky things to ensure the perfect amount of supplies are left at each base. We don't want to just drop off the same amount every time: that could lead to excessive supplies building up. We also have to account for space on both the ship and base to allow transfers. All this is addressed by unloading everything for a base at that base when the ship arrives, and then loading all of it back on the ship immediately, except the correct number of "retained units," which are the exact bill of supply. No overage just sitting there. For a simple animation of this, along with the restock buffer mechanic, see here: <https://jackinabox86.github.io/pages/>

If you made it this far, thanks for reading! Welcome any feedback from the community, along with corrections. All of us will have to decide how deeply we want to get into routes, but I do believe that ultimately, automating most bases will work out well for many players. A bit higher cost from a larger CX buffer can be offset by smaller planetary buffers, and less clicking is just a wonderful byproduct. Good luck in your planning.

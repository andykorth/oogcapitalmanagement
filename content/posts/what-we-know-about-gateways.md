---
title: "What we know about Gateways"
date: 2024-09-09T11:10:36+08:00
draft: false
language: en
featured_image: ../assets/images/jumpgate-header.png
summary: Everything we know about gateways so far
description: Everything we know about gateways so far
author: Archiel
authorimage: ../assets/images/archiel.png
accessCategories: Posts
tags: Posts
---


{{< calltoaction heading="ahhhhh" thetext="asdfasdf asdf" button="twp" buttonlink="3" >}}


Gateways are coming, and Antares will be ready for them!

## Key Points We Know: 

### How they work:

* A planetary government can commission one gateway in orbit. They administer that gateway.
* Ships without FTL drives can take gateways.
* Ships jump from a source gateway to a destination gateway that is in range. 
* Gateways have limits on ships per day, distance the gateway can reach, the volume of ships that can fly through it, and the fuel that is used. 
* Gateways need to be refueled occasionally using Vortex Fuel, which is consumed by gateway usage.
* Each gateway is linked to one other gateway, in a symmetric 1:1 relationship.

### Flying through gateways:

* Ships take time to travel through a gateway, balanced to be similar to an FTL jump.
* Ships take no damage through gateways.
* A short "ALIGN" phase is needed before starting the jump, once you are in the correct orbit.
* The flight buffer can take you through multiple gateways in a trip, if desired.
* You can see the tolls on the flight routing screen.

### How they are made:

* You can build multiple gateways in orbit of one planet.
* Governments can change the gateway destination with a motion.
* Any gateway can recieve ships, even if it doesn't match the (volume or range) requirements to send a ship back through. This can be a feature, enabling triangular paths of gates, but can be a disadvantage if you accidentally strand a STL ship.
* Gateways max out with 3 distance upgrades, and 5 upgrades total.


### The default gateway stats:

![Draft Gateway Stats ](/images/gateway-choices.png)

We have potentially non-final stats for the starting un-upgraded gateway. Observations about these values:

* 200 jumps per day starting value- in my estimation this is a lot of jumps.
* 1500 max ship volume. This fits a starter ship (963 m3), a WCB (1488 m3), but not a standard 2k (2675m). We don't know how much space is added per size upgrade.
* Distance starts at 10 parsecs and with 3 upgrades goes to a max of 25 parsecs.
* We don't know about fuel consumption rates.

## How far is 25 Parsecs?

OOG has a [specially refitted version of Taiyi's map](https://oogcapitalmanagement.com/map/) that can calculate gateway distances. Since it's hard to visualize actual distances in any of the maps, tools are essential for pre-planning gateway routes.

Phobos to Griffonstone is 15.1 parsecs. This also gets you towards the Northern Antares CX.
![Draft Gateway Stats ](http://kortham.net/temp/firefox_SRjXFCI08r.png)

Sometimes 20 parsecs can save quite a few jumps:
![More jumps](http://kortham.net/temp/firefox_9iOliroWBV.png)

We have additional python tools that can brute force jump distances.

## Potential routes

No concrete route plans have been made, but here are some ideas put forth by the Antares Community.

The LS-231 Transport Union Gateway Hub

![LS-231 Transport Union Gateway Hub](/images/LS231Hub.png)

The ANT - LS-231 pair offers a first set of gateways with some good usability, giving near access to Griffonstone and Etherwind. Expansions to the route give direct access to Benten, and a huge jump savings towards Hortus.

![Galactic Axis](/images/GalacticAxis.png)

The IA-603 to XH-400 Galactic Axis plan requires more gates, but gets you directly to Hortus, Benten, and Moria. The downside is that the first link of ANT - IA-603 offers little utility on its own. This requires a lot of coordination with other regions.

Other potential axes that are similar include:
* OF-208 IA-982
* XH-400 IA-603
* XH-400 PD-754

## Gateway Jumper

The shipyard engineers of OOG have designed the Gateway Jumper. At internal prices, this could be as low as 2m AIC with a 1000/1000 cargo bay. 

![Ship design ](/images/gateway-jumper.png)


## Gateway cost

Costs have been well covered in discussion on discord. We now have a pretty solid look at the materials for each upgrade cost. It seems the two distance upgrades adds a few hundred of each afab and 240 LIT. We don't know the cost of the new materials, but since it doesn't add TSH/RSH/PSH, it's pretty cheap, proportionally. Here are some of the new materials:

![New materials](/images/gateway-new-materials.png)

![New fuel types](/images/gateway-new-fuel.png)

Based on my work with the map distances, I think increased distance is a must-have upgrade. Every time you add 5 parsecs, you drastically increase the area under the gateway's circle, and the number of systems you could reach. 

Costs have been significantly analyzed by the community. See these calculations by Hernanduer.

Due to the high costs of a gateway, materials are also measured in Base-Area-Days. This is the amount of base area required to make the specified amount in one day. (so divide by 500 for a dedicated base). 

{{< foldoutLinkImage title="Gateway cost summary" image="/images/gateway-cost-summary.png" >}}

{{< foldoutLinkImage title="Gateway cost total, with intermediate steps" image="/images/gateway-cost-total.png" >}}


## Antares Gateway Planning

Te Antares Development Initiative is organizing gateway planning in the best region of space in the universe. It's important to consider both sides of a gateway in planning, the reusability of a gateway as a destination for multiple gateways, and the cost per jump saved, given the upgrades chosen.

[![Antares Logo](/images/ADI-Discord.png)](https://discord.gg/gmx7br5XBQ)


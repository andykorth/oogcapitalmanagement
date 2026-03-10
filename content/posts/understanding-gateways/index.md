---
title: "Understanding Gateways"
date: 2026-03-03T14:10:36+08:00
language: en
featured_image: images/understanding-gateways-narrow.png
summary: We've learned a lot about the practical design considerations for gateway networks since release.
description: We've learned a lot about the practical design considerations for gateway networks since release.
author: Archiel
authorimage: images/archiel.png
accessCategories: Posts
tags: News
fullWidthArticle: true
math: true
---

# Understanding Gateway Mechanics

The AGC’s open nature encourages active discussion and many ideas. However, gateway mechanics are complex, and it’s easy for conversations to drift away from the reality of those mechanics. When evaluating gateway placement, keep the following principles in mind.

## Traffic Volume Is Critical

It’s natural to want a gateway that serves your niche system. It may benefit you directly, and you may even know several players there.

However, a pair of gates costs 300k per week in upkeep. To justify that cost, you need roughly 100 trips per week through that gate. Even a large co-op of 20 players — which is substantial — only gets you about one-third of the way to viability.

Instead of anecdotal demand, examine workforce population data. As a rough benchmark, a planet with 100k population may represent a reasonable starting point for sustained traffic.

## The Value of a Gate: Parsecs Saved

{{< twoColImage right="true" imageURL="roshar-to-ew.png" >}}
A gateway must significantly reduce effective travel distance.

Consider Roshar to EW-238. 

* Via FTL: 46.6 parsecs over 7 jumps
* Via Gate: 16.91 parsecs

Your speed through a gate is 3 pc/hr. Your typical FTL speed will be higher, perhaps 3.5 to 4.5 pc/hr. Here we've got solid gate, but a modest distance reduction can still result in a slower trip overall.

64% distance saved is a solid improvement. A gate saving only 14% will probably always be worse than avoiding the gate.

{{< /twoColImage >}}

{{< twoColImage right="false" imageURL="image-1.png" >}}
As a rule of thumb:

Less than ~25% distance savings is not worth considering.

The [OOG map](/map/) now calculates distance saved. 

{{< /twoColImage >}}


## The STL Flight Time Penalty

Additionally, if you are not starting directly on the planet with the gate, you must account for STL travel time to reach it.

A gateway makes sense only if:

$$d_{\text{FTL}} \cdot v_{\text{FTL}} > d_{\text{gateway}} \cdot v_{\text{gateway}} + t_{\text{STL}}$$

Where:
* $t_{\text{STL}}$ is typically 2-4 hours. 
* $v_{\text{gateway}}$ will be 3 parsecs/hr
* $v_{\text{FTL}}$ typically slightly higher, 3.5 to 4.5.

Thanks to AppleTree23 for significant STL flight calculations. ANT -> Eos average 1.76 hours. ANT -> Heph averages 3.55 hrs. 

## Place Gates to minimize STL Flight length

{{< twoColImage right="false" imageURL="norwick-vs-eos.png" >}}

If your route requires:
* STL travel from a CX to a gate, or
* STL travel between planets within a system to reach a gate

you may introduce a long STL segment. Due to ship flight computer behavior and default SF allocation, these STL legs can be longer than expected. This is why some gate routes are slower than pure FTL routes.

We are now suggesting two rules:

* In the CX system, choose planet a. 
* Check if placing a gate in an adjacent systems reduces flight time.

In this case, Eos has a slight edge. The trip from CX to Eos is slightly longer than the gate approach. 

{{< /twoColImage >}}

## Don’t Compromise the Network for Aesthetic Connectivity

When people see a gateway map, there is a strong impulse to connect everything like a subway diagram. This often leads to inefficient placements made purely for visual or conceptual symmetry.

Gateways are not subways.

Instead, think of them as links in a [multi-modal transportation system](https://wiki.openttd.org/en/Manual/Feeder%20service).

It's okay that your UPS package flies on an airplane to your city, then takes a truck to your house. Demanding that every package stays on an airplane network reduces the effectiveness of the system. Our PRUN ships struggle with STL flight, in just the same way airplanes would struggle navigating to your house. Allowing for your "last mile" to happen via your ship's FTL drive reduces the role of the weak link of STL flight in the system.

## STL Ship Support

Designing around STL support might sound attractive. It expands theoretical use cases. I know I'm a people-pleaser and a compromiser, so it's easy for me to capitulate to watered-down ideas to reach a consensus. I'm working on myself. 

However:
* Supporting STL flight creates more constraints.
* This reduces gate placement quality.
* Resulting in a less effective network 

De-prioritizing STL support allows for stronger long-term placement decisions.

## Prioritize distance to CX

Choosing the innermost planet gives you better travel times to the CX. This is more important than prioritizing base-to-base traffic. Prioritize the common good over your personal bases or use cases.

## Design Tradeoffs, Volume vs. Distance

We can only choose *5 upgrades*.

Supporting 5k ships reduces maximum gateway range from 25pc to 20pc. The loss of range has an outsized effect:
* Lowers the actual distance of the gate, but also
* Lowers *average percent distance* saved
* Reduces overall gate effectiveness

## When Planet-to-Planet Gates Work

Planet-to-planet gates can be very strong under the right conditions.

Remember these facts:

* If both planets have gates in orbit, direct planet-to-planet routes are excellent.
* Most shipping follows hub-and-spoke patterns to the CX, not direct planet-to-planet trade.
* If you are on another planet in-system, STL costs may negate the benefit.
* A CX can't host a gate, so it will always have the STL element

For a planet to planet gate to succeed:

* Both planets need _very_ large populations.
* There must be sustained direct traffic between them.
  * There must be a specific purpose for this to happen, like H2O or C production.

Without both conditions, the gate will struggle to justify its upkeep.

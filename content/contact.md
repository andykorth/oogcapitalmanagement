---
title: Contact
language: en
description: Contact OOG
omit_header_text: true
type: page
---

To contact us, reach out to any OOG member on any of the Prosperous Universe discords.

We recommend joining the [UFO Discord](https://discord.gg/3ergfJVQXB) (United Faction Operations), and joining the recruitment section. Find the OOG recruitment post inside. 
<!-- @format -->

<section class="lg:pb-24">
    <div class="relative pb-16 mt-6">
        <div class="max-w-md mx-auto px-7 sm:max-w-3xl lg:max-w-7xl">
            <div class="relative px-6 py-10 overflow-hidden shadow-xl bg-primary-500 rounded-2xl sm:px-12 sm:py-20">
                <div class="relative">
                    <div class="sm:text-center">
                        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            {{ .Site.Params.P5.Heading }}
                        </h2>
                        {{ range .Site.Params.P5.Content }}
                        <p class="max-w-2xl mx-auto mt-6 text-lg text-primary-100">
                            {{ .text }}
                        </p>
                        {{ end }}
                    </div>
                    <div class="mt-12 sm:mx-auto sm:flex sm:max-w-lg">
                        <div class="mx-auto w-64">
                            <a href="https://discord.gg/3ergfJVQXB" class="block w-full px-5 py-3 text-base font-medium text-white bg-gray-900 border border-transparent rounded-md shadow hover:bg-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-500 sm:px-10">
                                {{ .Site.Params.P5.Button }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

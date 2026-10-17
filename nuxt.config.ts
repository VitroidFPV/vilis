// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/eslint", "@nuxt/ui"],
	colorMode: {
		preference: "system",
		storageKey: "alza-color-mode",
	},
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
	css: ["~/assets/css/main.css"],
	app: {
		head: {
			title: "Vilis",
			link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.svg" }],
		},
	},
})

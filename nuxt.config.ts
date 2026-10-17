// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/eslint", "@nuxt/ui"],
	nitro: { preset: "cloudflare_module" },
	colorMode: {
		preference: "system",
		storageKey: "vilis-color-mode",
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

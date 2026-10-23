export default defineAppConfig({
	ui: {
		colors: {
			primary: "cyan",
			neutral: "zinc",
			orange: "orange"
		},
		button: {
			defaultVariants: {
				variant: "soft",
			},
		},
		badge: {
			variants: {
				size: {
					xs: { base: "rounded-full" },
					sm: { base: "rounded-full" },
					md: { base: "rounded-full" },
					lg: { base: "rounded-full" },
					xl: { base: "rounded-full" },
				},
			},
			defaultVariants: {
				variant: "soft",
			},
		},
		input: {
			defaultVariants: {
				variant: "soft",
			}
		},
		select: {
			defaultVariants: {
				variant: "soft"
			}
		},
		selectMenu: {
			defaultVariants: {
				variant: "soft"
			}
		}
	},
})

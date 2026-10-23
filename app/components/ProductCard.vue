<script setup lang="ts">
const props = defineProps<{
	product: {
		alzaId: number
		name: string
		url: string
		imageUrl: string | null
		priceAfterCoupon: number
		priceWithoutCoupon: number
		discountPct: number
		couponCode: string
	}
}>()

const currency = new Intl.NumberFormat("cs-CZ", {
	style: "currency",
	currency: "CZK",
	maximumFractionDigits: 0,
})
const toast = useToast()

const priceDetailsOpen = ref(false)
const priceDetailsLoading = ref(false)
const priceDetailsError = ref(false)
const tierPrices = ref<{ label: string; price: number }[] | null>(null)
let pricesLoadedAt = 0
let errorResetTimer: ReturnType<typeof setTimeout> | undefined

onUnmounted(() => clearTimeout(errorResetTimer))

const tierStyle: Record<
	string,
	{ color: "info" | "warning" | "neutral" | "primary" | "orange"; icon: string }
> = {
	B2B: { color: "info", icon: "i-lucide-handshake" },
	Gold: { color: "warning", icon: "i-lucide-circle-check-big" },
	Silver: { color: "neutral", icon: "i-lucide-circle-check-big" },
	ISIC: { color: "primary", icon: "i-lucide-graduation-cap" },
	Bronze: { color: "orange", icon: "i-lucide-circle-check-big" },
}

type TierPricesResponse = {
	id: string
	prices: { label: string; price: number }[]
}

function showNoTierPricesToast() {
	toast.add({
		title: "Žádné odlišné ceny ceníků",
		color: "info",
		icon: "i-lucide-info",
		duration: 3000,
	})
}

async function loadTierPrices() {
	if (priceDetailsLoading.value) return
	clearTimeout(errorResetTimer)
	priceDetailsLoading.value = true
	priceDetailsError.value = false
	try {
		const response = await fetch(`/api/tier-prices/${props.product.alzaId}`)
		if (!response.ok) throw new Error(`Tier prices returned ${response.status}`)
		const data = (await response.json()) as TierPricesResponse
		if (
			data.id !== String(props.product.alzaId) ||
			!Array.isArray(data.prices)
		) {
			throw new Error("Invalid tier price response")
		}
		tierPrices.value = data.prices
			.filter(
				(entry) =>
					entry !== null &&
					typeof entry.label === "string" &&
					entry.label.split("/").every((name) => name in tierStyle) &&
					Number.isFinite(entry.price) &&
					entry.price > 0,
			)
			.map(({ label, price }) => ({ label, price }))
		pricesLoadedAt = Date.now()
		if (tierPrices.value.length) priceDetailsOpen.value = true
		else showNoTierPricesToast()
	} catch {
		priceDetailsError.value = true
		errorResetTimer = setTimeout(() => {
			priceDetailsError.value = false
		}, 3000)
		toast.add({
			title: "Ceníky se nepodařilo načíst",
			description: "Zkuste to prosím znovu.",
			color: "error",
			icon: "i-lucide-circle-alert",
			duration: 3000,
		})
	} finally {
		priceDetailsLoading.value = false
	}
}

function togglePriceDetails() {
	if (priceDetailsOpen.value) {
		priceDetailsOpen.value = false
	} else if (
		tierPrices.value !== null &&
		Date.now() - pricesLoadedAt < 30 * 60 * 1000
	) {
		if (tierPrices.value.length) priceDetailsOpen.value = true
		else showNoTierPricesToast()
	} else {
		void loadTierPrices()
	}
}
</script>

<template>
	<a
		:href="product.url"
		target="_blank"
		rel="noopener noreferrer"
		class="group overflow-clip rounded-2xl border border-neutral-200 p-1 transition-colors duration-200 hover:border-primary-500/70 hover:bg-neutral-100 focus-visible:border-primary-500/70 focus-visible:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:border-neutral-700 dark:hover:bg-neutral-800/50 dark:focus-visible:bg-neutral-800/50"
	>
		<div class="relative h-52 overflow-hidden">
			<div
				class="absolute inset-0 rounded-xl bg-white p-6 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out"
				:class="priceDetailsOpen ? '-translate-x-full' : 'translate-x-0'"
				:aria-hidden="priceDetailsOpen"
			>
				<img
					v-if="product.imageUrl"
					:src="product.imageUrl"
					:alt="product.name"
					class="mb-3 h-full w-full object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-102 motion-safe:group-focus-visible:scale-102"
					loading="lazy"
				/>
			</div>
			<div
				class="absolute inset-0 flex flex-col gap-2 overflow-y-auto p-2 text-sm motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out"
				:class="priceDetailsOpen ? 'translate-x-0' : 'translate-x-full'"
				:aria-hidden="!priceDetailsOpen"
			>
				<div
					v-for="tier in tierPrices"
					:key="tier.label"
					class="flex items-center justify-between gap-2"
				>
					<div class="flex flex-wrap gap-1">
						<UBadge
							v-for="name in tier.label.split('/')"
							:key="name"
							size="lg"
							:color="tierStyle[name]!.color"
							:icon="tierStyle[name]!.icon"
							>{{ name }}</UBadge
						>
					</div>
					<span class="shrink-0">{{ currency.format(tier.price) }}</span>
				</div>
				<p class="mt-auto text-xs text-neutral-500 dark:text-neutral-400">
					Ceny z Alza.cz
				</p>
			</div>
		</div>
		<div class="flex flex-col gap-2 px-2 py-3">
			<h2 class="line-clamp-2 font-semibold">{{ product.name }}</h2>
			<div class="flex gap-2 items-end">
				<div class="text-2xl font-bold">
					{{ currency.format(product.priceAfterCoupon) }}
				</div>
				<div
					class="text-sm text-neutral-500 line-through dark:text-neutral-400"
				>
					{{ currency.format(product.priceWithoutCoupon) }}
				</div>
				<div class="ml-auto">
					<UButton
						:color="priceDetailsError ? 'error' : 'neutral'"
						:icon="
							priceDetailsError
								? 'i-lucide-circle-alert'
								: 'i-lucide-list-collapse'
						"
						:loading="priceDetailsLoading"
						:aria-label="
							priceDetailsLoading
								? 'Načítání cen ceníků'
								: priceDetailsError
									? 'Zkusit znovu načíst ceny ceníků'
									: priceDetailsOpen
										? 'Skrýt ceny ceníků'
										: 'Zobrazit ceny ceníků'
						"
						:aria-expanded="priceDetailsOpen"
						@click.prevent.stop="togglePriceDetails"
					/>
				</div>
			</div>
			<div class="flex gap-2 items-center mt-2">
				<div class="text-neutral-600 dark:text-neutral-300">
					-{{ product.discountPct }}%
				</div>
				<div class="font-semibold">{{ product.couponCode }}</div>
				<UIcon
					name="i-lucide-arrow-up-right"
					class="ml-auto transition-colors duration-200 group-hover:text-primary-400 group-focus-visible:text-primary-400 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-safe:group-focus-visible:-translate-y-0.5"
				/>
			</div>
		</div>
	</a>
</template>

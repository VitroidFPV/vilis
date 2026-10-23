<script setup lang="ts">
defineProps<{
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
</script>

<template>
	<a
		:href="product.url"
		target="_blank"
		rel="noopener noreferrer"
		class="group overflow-clip rounded-2xl border border-neutral-200 p-1 transition-colors duration-200 hover:border-primary-500/70 hover:bg-neutral-100 focus-visible:border-primary-500/70 focus-visible:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:border-neutral-700 dark:hover:bg-neutral-800/50 dark:focus-visible:bg-neutral-800/50"
	>
		<div class="bg-white py-4 rounded-xl">
			<img
				v-if="product.imageUrl"
				:src="product.imageUrl"
				:alt="product.name"
				class="mb-3 h-40 w-full object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-102 motion-safe:group-focus-visible:scale-102"
				loading="lazy"
			/>
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

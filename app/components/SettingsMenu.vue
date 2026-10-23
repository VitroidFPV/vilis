<script setup lang="ts">
const colorMode = useColorMode()
const priceTiers = ["Basic", "Bronze", "Silver", "Gold", "ISIC", "B2B"] as const
const selectedPriceTiers = ref<string[]>(["Basic"])
const themeOptions = [
	{ label: "Podle zařízení", value: "system" },
	{ label: "Světlý", value: "light" },
	{ label: "Tmavý", value: "dark" },
]
</script>

<template>
	<UModal title="Nastavení" :ui="{ content: 'max-w-2xl' }">
		<UButton
			icon="i-lucide-settings"
			label="Nastavení"
			aria-label="Nastavení"
			color="neutral"
			variant="soft"
			class="ml-auto min-h-11 lg:min-h-0 lg:size-8 lg:justify-center lg:p-0"
			:ui="{ label: 'lg:hidden' }"
		/>
		<template #body>
			<div class="space-y-7 pb-2">
				<section
					aria-labelledby="language-heading"
					class="grid gap-3 sm:grid-cols-[11rem_1fr] sm:gap-6"
				>
					<div>
						<h2 id="language-heading" class="font-semibold">Jazyk aplikace</h2>
						<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
							Texty rozhraní a formátování.
						</p>
					</div>
					<div class="rounded-xl bg-muted p-4">
						<div class="flex items-center justify-between gap-3">
							<span class="text-sm font-medium">Čeština</span>
							<span class="text-sm text-neutral-500 dark:text-neutral-400"
								>Aktuální</span
							>
						</div>
						<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
							Angličtina bude dostupná po překladu rozhraní.
						</p>
					</div>
				</section>
				<section
					aria-labelledby="theme-heading"
					class="grid gap-3 border-t border-neutral-200 pt-6 sm:grid-cols-[11rem_1fr] sm:gap-6 dark:border-neutral-700"
				>
					<div>
						<h2 id="theme-heading" class="font-semibold">Vzhled</h2>
						<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
							Přizpůsobte barvy aplikace.
						</p>
					</div>
					<div
						role="radiogroup"
						aria-label="Barevný režim"
						class="self-center rounded-xl bg-muted p-2"
					>
						<div class="grid grid-cols-3 gap-1">
							<label
								v-for="option in themeOptions"
								:key="option.value"
								class="cursor-pointer"
							>
								<input
									v-model="colorMode.preference"
									type="radio"
									name="theme"
									:value="option.value"
									class="peer sr-only"
								/>
								<span
									class="flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-sm font-medium text-neutral-600 hover:bg-accented peer-checked:bg-default peer-checked:text-highlighted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500 dark:text-neutral-300"
									>{{ option.label }}</span
								>
							</label>
						</div>
					</div>
				</section>
				<section
					aria-labelledby="tiers-heading"
					class="grid gap-3 border-t border-neutral-200 pt-6 sm:grid-cols-[11rem_1fr] sm:gap-6 dark:border-neutral-700"
				>
					<div>
						<h2 id="tiers-heading" class="font-semibold">Cenové ceníky</h2>
						<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
							Které ceny vás zajímají?
						</p>
					</div>
					<div class="rounded-xl bg-muted p-4">
						<fieldset>
							<legend class="sr-only">Vybrané cenové ceníky</legend>
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
								<label
									v-for="tier in priceTiers"
									:key="tier"
									class="cursor-pointer"
								>
									<input
										v-model="selectedPriceTiers"
										type="checkbox"
										:value="tier"
										class="peer sr-only"
									/>
									<span
										class="flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 bg-default px-3 text-sm font-medium text-neutral-700 hover:border-neutral-500 peer-checked:border-primary-500 peer-checked:bg-primary-50 peer-checked:text-primary-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-400 dark:peer-checked:border-primary-400 dark:peer-checked:bg-primary-950 dark:peer-checked:text-primary-200"
										>{{ tier }}</span
									>
								</label>
							</div>
						</fieldset>
						<p
							class="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
						>
							Zatím jen náhled volby. Katalog obsahuje veřejné akční ceny,
							nikoli ceny jednotlivých ceníků.
						</p>
					</div>
				</section>
			</div>
		</template>
	</UModal>
</template>

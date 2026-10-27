// Discord's UI components, unwrapped.
// Revenge gives plugins these as lazy proxies that pretend to be functions. Some components
// (like TextInput) are really forwardRef/memo objects, so React tries to call them and
// crashes with "target is not callable". Getting the real value avoids that.

let cache

function unwrap(value) {
	const factory = bunny.utils?.lazy?.getProxyFactory?.(value)
	return factory ? factory() : value
}

// Call this inside a component, not at the top of a file, so Discord's modules are loaded by then
export function getComponents() {
	if (cache) return cache

	const all = bunny.metro.common.components
	cache = {}
	for (const name of [
		'Stack',
		'TableRowGroup',
		'TableSwitchRow',
		'TableRadioGroup',
		'TableRadioRow',
		'TableRowIcon',
		'TextInput',
		'AlertModal',
		'AlertActionButton',
		'AlertActions',
	]) {
		cache[name] = unwrap(all[name])
	}
	return cache
}

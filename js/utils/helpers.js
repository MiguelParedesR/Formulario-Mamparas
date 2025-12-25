// Utilities for UI positioning and sidebar-aware modals
export function getSidebarOffset() {
	const isDesktop = window.innerWidth >= 1024;
	if (!isDesktop) return "0px";
	const hidden = document.body.classList.contains("sidebar-hidden");
	if (hidden) return "0px";
	const collapsed = document.body.classList.contains("sidebar-collapsed");
	const rootStyles = getComputedStyle(document.documentElement);
	const expanded = (rootStyles.getPropertyValue("--sidebar-width") || "250px").trim();
	const collapsedW = (rootStyles.getPropertyValue("--sidebar-width-collapsed") || "72px").trim();
	return collapsed ? collapsedW : expanded;
}

export function positionModal(modal) {
	if (!modal) return;
	const offset = getSidebarOffset();
	if (offset && offset !== "0px") {
		modal.style.left = offset;
		modal.style.right = "0";
		modal.style.width = `calc(100% - ${offset})`;
	} else {
		modal.style.left = "0";
		modal.style.right = "0";
		modal.style.width = "100%";
	}
}

export function watchModalPosition(modal) {
	if (!modal) return;
	const handler = () => positionModal(modal);
	window.addEventListener("resize", handler);
	window.addEventListener("sidebar:state-sync", handler);
	// return a way to unwatch if needed
	return () => {
		window.removeEventListener("resize", handler);
		window.removeEventListener("sidebar:state-sync", handler);
	};
}

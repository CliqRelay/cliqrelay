import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import type { NavItem } from "@repo/extensions-sdk";

import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({ items }: { items: NavItem[] }) {
	const { pathname } = useLocation();

	const renderItem = (item: NavItem) => {
		if (item.isSection && item.label) {
			return (
				<SidebarGroup key={item.label} className="p-0 pt-5 first:pt-0">
					<SidebarGroupLabel className="p-0 text-xs font-medium uppercase text-sidebar-foreground">
						{item.label}
					</SidebarGroupLabel>
				</SidebarGroup>
			);
		}
		const hasChildren = !!item.children?.length;
		if (hasChildren && item.title) {
			return (
				<SidebarGroup key={item.title} className="p-0">
					<SidebarMenu>
						<Collapsible>
							<SidebarMenuItem>
								<CollapsibleTrigger
									asChild
									className="w-full collapsible/button"
								>
									<SidebarMenuButton
										tooltip={item.title}
										className="rounded-xl text-sm px-3 py-2 h-9 cursor-pointer"
									>
										{item.icon &&
											(typeof item.icon === "function" ? (
												<item.icon size={16} />
											) : (
												item.icon
											))}
										<span>{item.title}</span>
										<ChevronRight className="ml-auto transition-transform duration-200 collapsible/button-[aria-expanded='true']:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub className="me-0 pe-0">
										{item.children!.map(renderItemSub)}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					</SidebarMenu>
				</SidebarGroup>
			);
		}
		if (item.title) {
			const isActive = item.isActive ?? pathname === item.href;

			return (
				<SidebarGroup key={item.title} className="p-0">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								tooltip={item.title}
								className={cn(
									"rounded-lg text-sm px-3 py-2 h-9",
									isActive
										? "bg-primary hover:bg-primary dark:bg-blue-500 text-white dark:hover:bg-blue-500 hover:text-white"
										: "",
								)}
							>
								<Link
									to={item.href}
									className="w-full flex flex-row justify-start items-center gap-2"
								>
									{item.icon && <item.icon size={16} />}
									{item.title}
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			);
		}
		return null;
	};

	const renderItemSub = (item: NavItem) => {
		const hasChildren = !!item.children?.length;
		if (hasChildren && item.title) {
			return (
				<SidebarMenuSubItem key={item.title}>
					<Collapsible>
						<CollapsibleTrigger className="w-full">
							<SidebarMenuSubButton className="rounded-xl text-sm px-3 py-2 h-9">
								{item.icon && <item.icon />}
								<span>{item.title}</span>
								<ChevronRight className="ml-auto transition-transform duration-200 data-[state=open]:rotate-90" />
							</SidebarMenuSubButton>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<SidebarMenuSub className="me-0 pe-0">
								{item.children!.map(renderItemSub)}
							</SidebarMenuSub>
						</CollapsibleContent>
					</Collapsible>
				</SidebarMenuSubItem>
			);
		}
		if (item.title) {
			return (
				<SidebarMenuSubItem key={item.title} className="w-full">
					<SidebarMenuSubButton className="w-full" asChild>
						<Link to={item.href}>{item.title}</Link>
					</SidebarMenuSubButton>
				</SidebarMenuSubItem>
			);
		}
		return null;
	};

	return <>{items.map(renderItem)}</>;
}

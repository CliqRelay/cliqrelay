import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface DataPaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

function getVisiblePages(
	current: number,
	total: number,
): (number | "ellipsis")[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const pages: (number | "ellipsis")[] = [1];

	if (current <= 3) {
		for (let i = 2; i <= 5; i++) pages.push(i);
		pages.push("ellipsis");
		pages.push(total);
	} else if (current >= total - 2) {
		pages.push("ellipsis");
		for (let i = total - 4; i <= total; i++) pages.push(i);
	} else {
		pages.push("ellipsis");
		pages.push(current - 1, current, current + 1);
		pages.push("ellipsis");
		pages.push(total);
	}

	return pages;
}

export function DataPagination({
	currentPage,
	totalPages,
	onPageChange,
}: DataPaginationProps) {
	if (totalPages <= 1) return null;

	const pages = getVisiblePages(currentPage, totalPages);
	const isFirstPage = currentPage === 1;
	const isLastPage = currentPage === totalPages;
	let ellipsisCounter = 0;

	return (
		<div className="mt-8 flex justify-center">
			<Pagination>
				<PaginationContent className="gap-1 sm:gap-1.5">
					<PaginationItem>
						<PaginationPrevious
							onClick={() => onPageChange(currentPage - 1)}
							aria-disabled={isFirstPage}
							className={`h-9 rounded-[14px] border border-border bg-surface-1 px-2 sm:px-3 text-[12.5px] font-medium text-muted-foreground transition-all duration-200 cursor-pointer ${
								isFirstPage
									? "opacity-40 pointer-events-none"
									: "hover:border-border-strong hover:bg-surface-2 hover:text-foreground hover:-translate-y-px"
							}`}
						/>
					</PaginationItem>
					{pages.map((page) => {
						if (page === "ellipsis") {
							ellipsisCounter++;
							return (
								<PaginationItem key={`ellipsis-${ellipsisCounter}`}>
									<PaginationEllipsis className="h-9 w-9 text-muted-foreground/40" />
								</PaginationItem>
							);
						}
						return (
							<PaginationItem key={page}>
								<PaginationLink
									onClick={() => onPageChange(page)}
									isActive={page === currentPage}
									className={`h-9 w-9 rounded-[14px] text-[12.5px] font-medium transition-all duration-200 cursor-pointer ${
										page === currentPage
											? "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/20"
											: "border border-transparent text-muted-foreground/60 hover:border-border-strong hover:bg-surface-2 hover:text-foreground"
									}`}
								>
									{page}
								</PaginationLink>
							</PaginationItem>
						);
					})}
					<PaginationItem>
						<PaginationNext
							onClick={() => onPageChange(currentPage + 1)}
							aria-disabled={isLastPage}
							className={`h-9 rounded-[14px] border border-border bg-surface-1 px-2 sm:px-3 text-[12.5px] font-medium text-muted-foreground transition-all duration-200 cursor-pointer ${
								isLastPage
									? "opacity-40 pointer-events-none"
									: "hover:border-border-strong hover:bg-surface-2 hover:text-foreground hover:-translate-y-px"
							}`}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}

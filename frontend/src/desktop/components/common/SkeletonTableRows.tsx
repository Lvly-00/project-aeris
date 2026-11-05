import { Skeleton, Table } from '@mantine/core';

interface SkeletonTableRowsProps {
    /** One width per column, matching the real table header. */
    columns: (number | string)[];
    rows?: number;
}

/**
 * Placeholder rows for a desktop data table. Rendered inside `Table.Tbody`,
 * so the header, filters and pagination stay real while the page loads.
 */
export const SkeletonTableRows = ({ columns, rows = 8 }: SkeletonTableRowsProps) => (
    <>
        {Array.from({ length: rows }, (_, rowIndex) => (
            <Table.Tr key={rowIndex}>
                {columns.map((width, columnIndex) => (
                    <Table.Td
                        key={columnIndex}
                        style={{ width, maxWidth: typeof width === 'number' ? width : undefined }}
                    >
                        <Skeleton h={16} w="100%" radius="sm" />
                    </Table.Td>
                ))}
            </Table.Tr>
        ))}
    </>
);

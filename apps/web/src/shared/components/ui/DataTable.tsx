import { ConfigProvider, Table, type TableProps, type ThemeConfig } from 'antd';
import { cn } from '../../lib/cn';
import { colors } from '../../../theme/tokens';

const tableTheme: ThemeConfig = {
  components: {
    Table: {
      headerBg: colors.canvas,
      headerColor: colors.muted,
      headerSplitColor: 'transparent',
      headerBorderRadius: 0,
      headerSortActiveBg: colors.subtle,
      headerSortHoverBg: colors.subtle,
      bodySortBg: 'transparent',
      borderColor: colors.lineSoft,
      rowHoverBg: '#FAFBFD',
      rowSelectedBg: colors.primarySoft,
      rowSelectedHoverBg: colors.primarySoft,
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellFontSize: 14,
      footerBg: colors.surface,
    },
    Pagination: {
      itemActiveBg: colors.primarySoft,
    },
  },
};

export type DataTableProps<Row extends object> = TableProps<Row> & {
  /** Render without its own border, for tables that sit inside a Panel. */
  embedded?: boolean;
};

/** Table surface with the product's header, row and spacing treatment. Content comes from the caller. */
export function DataTable<Row extends object>({
  className,
  embedded = false,
  scroll,
  classNames,
  ...props
}: DataTableProps<Row>) {
  return (
    <ConfigProvider theme={tableTheme}>
      <div
        className={cn(
          'overflow-hidden',
          !embedded && 'rounded-xl border border-line bg-surface shadow-card',
          className,
        )}
      >
        <Table<Row>
          scroll={scroll ?? { x: 'max-content' }}
          classNames={{
            header: { cell: 'whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-[0.04em]' },
            pagination: { root: 'px-4' },
            ...classNames,
          }}
          {...props}
        />
      </div>
    </ConfigProvider>
  );
}

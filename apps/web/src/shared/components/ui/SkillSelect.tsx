import { Select, Tag, type SelectProps } from 'antd';
import { X } from 'lucide-react';

type SkillSelectProps = Omit<SelectProps<string[]>, 'mode' | 'tagRender'>;

/** Free-entry skill picker whose chips use the primary colour. */
export function SkillSelect(props: SkillSelectProps) {
  return (
    <Select<string[]>
      mode="tags"
      tokenSeparators={[',']}
      notFoundContent={null}
      open={false}
      suffix={null}
      tagRender={({ label, closable, onClose }) => (
        <Tag
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          closable={closable}
          onClose={onClose}
          closeIcon={<X size={12} aria-label="Remove" className="text-primary/70 hover:text-primary" />}
          className="my-0.5 me-1 inline-flex h-6 items-center gap-1 border-primary-line bg-primary-soft px-2 text-[12.5px] font-medium text-primary"
        >
          {label}
        </Tag>
      )}
      {...props}
    />
  );
}

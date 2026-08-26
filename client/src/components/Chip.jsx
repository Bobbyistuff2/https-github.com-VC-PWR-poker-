import './Chip.css';

export default function Chip({ value, color, text, size = 'md', onClick, disabled }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`chip chip--${size}`}
      style={{ '--chip-color': color, '--chip-text': text }}
      onClick={onClick}
      disabled={disabled}
      type={onClick ? 'button' : undefined}
    >
      {value}
    </Tag>
  );
}

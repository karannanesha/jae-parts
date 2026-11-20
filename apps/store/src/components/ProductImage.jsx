export default function ProductImage({ product, index = 0, label = 'PRODUCT PHOTO', style }) {
  const img = product?.images?.[index];
  if (img?.url) {
    return <img src={img.url} alt={img.alt || product.name} loading="lazy" decoding="async" className="img-cover" style={style} />;
  }
  return <div className="ph" style={{ width: '100%', height: '100%', ...style }}>{label}</div>;
}

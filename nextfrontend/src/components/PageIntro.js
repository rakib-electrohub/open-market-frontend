export default function PageIntro({ eyebrow = "OPEN MARKET", title, description }) {
  return (
    <section className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p className="lede">{description}</p> : null}
    </section>
  );
}
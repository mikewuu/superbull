import { cn } from '../../../lib/cn';

type SectionHeaderProps = {
  kicker: string;
  l1: string;
  l2?: string;
  sub?: string;
  center?: boolean;
};

export function SectionHeader(props: SectionHeaderProps): React.ReactElement {
  const { kicker, l1, l2, sub, center = false } = props;
  return (
    <div className={cn('max-w-2xl', { 'mx-auto text-center': center })}>
      <p className="text-2sm font-semibold tracking-[0.14em] text-candy-orange uppercase">
        {kicker}
      </p>
      <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
        {l1}
        {l2 ? (
          <>
            <br />
            <span className="text-content-muted">{l2}</span>
          </>
        ) : null}
      </h2>
      {sub ? (
        <p
          className={cn('mt-5 max-w-xl text-lg leading-8 text-content-default', {
            'mx-auto': center,
          })}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

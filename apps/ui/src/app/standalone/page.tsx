'use client';

import '@rest-in-time/design-system';
import { PropsWithChildren } from 'react';

export default function Home() {
  return (
    <main className="p-9 flex flex-col gap-3">
      <Card title="Notes">
        <music-note duration="whole"></music-note>
        <music-note duration="half"></music-note>
        <music-note></music-note>
        {/**todo: remove value A# */}
        <music-note value="A#" duration="eighth"></music-note>
        <music-note value="A#" duration="sixteenth"></music-note>
        <music-note value="A#" duration="thirtysecond"></music-note>
        <music-note value="A#" duration="sixtyfourth"></music-note>
        <music-note value="A#" duration="hundredtwentyeighth"></music-note>
      </Card>
      <Card title="Chords">
        <music-chord>
          <music-note></music-note>
          <music-note></music-note>
        </music-chord>
      </Card>
    </main>
  );
}

interface ICardProps {
  title: string;
}

const Card = (props: PropsWithChildren<ICardProps>) => {
  return (
    <div>
      <h1>{props.title}</h1>
      {props.children}
    </div>
  );
};

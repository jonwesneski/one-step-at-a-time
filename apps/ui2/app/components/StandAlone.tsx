import '@one-step-at-a-time/web-components';
import { PropsWithChildren } from 'react';

export default function StandAlone() {
  return (
    <main className="p-9 flex flex-col gap-3">
      <Card title="Notes">
        <music-note duration="whole"></music-note>
        <music-note duration="half"></music-note>
        <music-note></music-note>
        <music-note duration="eighth"></music-note>
        <music-note duration="sixteenth"></music-note>
        <music-note duration="thirtysecond"></music-note>
        <music-note duration="sixtyfourth"></music-note>
        <music-note duration="hundredtwentyeighth"></music-note>
      </Card>
      <Card title="Chords">
        <music-chord>
          <music-note></music-note>
          <music-note></music-note>
        </music-chord>
      </Card>
      <Card title="Staff Chord">
        <music-staff-treble>
          <music-note value="A" tie="start"></music-note>
          <music-note value="A" tie="end"></music-note>
        </music-staff-treble>
      </Card>
      <Card title="3 in a row">
        <music-composition>
          <music-measure>
            <music-staff-treble></music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble></music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble></music-staff-treble>
          </music-measure>
          {/** 4th shows on next row */}
          <music-measure>
            <music-staff-treble></music-staff-treble>
          </music-measure>
        </music-composition>
      </Card>
      <Card title="5 in a row">
        <music-composition>
          <music-measure>
            <music-staff-treble>
              <music-note value="E" duration="whole"></music-note>
            </music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble>
              <music-note value="E" duration="whole"></music-note>
            </music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble>
              <music-note value="E" duration="whole"></music-note>
            </music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble>
              <music-note value="E" duration="whole"></music-note>
            </music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble>
              <music-note value="E" duration="whole"></music-note>
            </music-staff-treble>
          </music-measure>
          {/** 6th shows on next row */}
          <music-measure>
            <music-staff-treble>
              <music-note value="E" duration="whole"></music-note>
            </music-staff-treble>
          </music-measure>
        </music-composition>
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

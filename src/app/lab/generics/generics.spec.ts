import { HighlightMatchPipe } from './highlight-match-pipe';

describe('HighlightMatchPipe', () => {
  const pipe = new HighlightMatchPipe();

  it('evidenzia ogni parola cercata, case-insensitive', () => {
    expect(pipe.transform('Mario Rossi', 'mar ROS')).toEqual([
      { text: 'Mar', match: true },
      { text: 'io ', match: false },
      { text: 'Ros', match: true },
      { text: 'si', match: false },
    ]);
  });

  it('query vuota o con caratteri speciali non rompe il testo', () => {
    expect(pipe.transform('a.b', '')).toEqual([{ text: 'a.b', match: false }]);
    expect(pipe.transform('a.b', '.')).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
    ]);
  });
});

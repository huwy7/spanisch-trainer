import type { TenseId } from './tenses.ts';

export interface TenseInfoText {
  /** When the tense is used (German UI text). */
  use: string;
  /** How it is formed. */
  formation: string;
  /** Typical signal words, if helpful. */
  signals?: string;
  /** 2–3 example sentences (no vosotros, SPEC §2). */
  examples: { es: string; de: string }[];
  /** Irregular verb shown next to the regular models. */
  irregularModel: string;
}

/** Regular model verbs for the conjugation tables (SPEC §3 K, tense info). */
export const MODEL_VERBS = ['hablar', 'comer', 'vivir'] as const;

export const TENSE_INFO: Record<TenseId, TenseInfoText> = {
  pres: {
    use: 'Gegenwart: was jetzt oder regelmässig passiert, allgemeine Wahrheiten, oft auch nahe Zukunft.',
    formation:
      'Stamm + Endung. -ar: -o, -as, -a, -amos, -an · -er: -o, -es, -e, -emos, -en · -ir: -o, -es, -e, -imos, -en. Häufig Stammwechsel (e→ie, o→ue, e→i) ausser bei nosotros.',
    signals: 'siempre, normalmente, cada día, ahora',
    examples: [
      { es: 'Trabajo en una oficina.', de: 'Ich arbeite in einem Büro.' },
      { es: 'Los sábados comemos con mis padres.', de: 'Samstags essen wir bei meinen Eltern.' },
      { es: 'Mañana salgo temprano.', de: 'Morgen gehe ich früh los.' },
    ],
    irregularModel: 'tener',
  },
  indef: {
    use: 'Abgeschlossene Handlung in der Vergangenheit, zu einem bestimmten Zeitpunkt oder als Abfolge von Ereignissen („was passierte dann?“).',
    formation:
      '-ar: -é, -aste, -ó, -amos, -aron · -er/-ir: -í, -iste, -ió, -imos, -ieron. Viele unregelmässige Stämme ohne Akzent: tuve, hice, dije, pude, estuve.',
    signals: 'ayer, el lunes pasado, en 2019, hace dos años, de repente',
    examples: [
      { es: 'Ayer hablé con mi hermana.', de: 'Gestern habe ich mit meiner Schwester gesprochen.' },
      { es: 'En 2019 vivieron en Lima.', de: '2019 wohnten sie in Lima.' },
      { es: 'Llegó, cenó y se fue a dormir.', de: 'Er kam an, ass zu Abend und ging schlafen.' },
    ],
    irregularModel: 'hacer',
  },
  perf: {
    use: 'Vergangenheit mit Bezug zur Gegenwart: in einem noch nicht abgeschlossenen Zeitraum (hoy, esta semana) oder Erfahrungen (alguna vez, nunca). In Lateinamerika oft durch das Indefinido ersetzt.',
    formation:
      'haber im Präsens (he, has, ha, hemos, han) + Partizip (-ado / -ido). Unregelmässige Partizipien: hecho, dicho, visto, puesto, escrito, vuelto, abierto, roto, muerto.',
    signals: 'hoy, esta semana, este año, todavía no, ya, alguna vez, nunca',
    examples: [
      { es: 'Hoy he trabajado mucho.', de: 'Heute habe ich viel gearbeitet.' },
      { es: '¿Has estado alguna vez en México?', de: 'Warst du schon einmal in Mexiko?' },
      { es: 'Todavía no hemos comido.', de: 'Wir haben noch nicht gegessen.' },
    ],
    irregularModel: 'hacer',
  },
  ir_a: {
    use: 'Nahe oder geplante Zukunft („ich werde gleich …“, „ich habe vor …“). Im Alltag häufiger als das Futuro simple.',
    formation: 'ir im Präsens (voy, vas, va, vamos, van) + a + Infinitiv.',
    signals: 'mañana, esta noche, el próximo año, pronto',
    examples: [
      { es: 'Voy a llamar a mi madre.', de: 'Ich werde meine Mutter anrufen.' },
      { es: 'Va a llover esta tarde.', de: 'Heute Nachmittag wird es regnen.' },
      { es: '¿Qué vas a hacer el fin de semana?', de: 'Was machst du am Wochenende?' },
    ],
    irregularModel: 'hacer',
  },
  imperf: {
    use: 'Vergangenheit als Hintergrund: Gewohnheiten, Beschreibungen, Zustände, laufende Handlungen („war gerade dabei“). Das Indefinido erzählt die Ereignisse, das Imperfecto beschreibt die Kulisse.',
    formation:
      '-ar: -aba, -abas, -aba, -ábamos, -aban · -er/-ir: -ía, -ías, -ía, -íamos, -ían. Nur drei unregelmässige Verben: ser (era), ir (iba), ver (veía).',
    signals: 'antes, siempre, de niño, todos los días, mientras',
    examples: [
      { es: 'De niño jugaba mucho al fútbol.', de: 'Als Kind spielte ich viel Fussball.' },
      {
        es: 'La casa era grande y tenía un jardín.',
        de: 'Das Haus war gross und hatte einen Garten.',
      },
      { es: 'Leía cuando sonó el teléfono.', de: 'Ich las gerade, als das Telefon klingelte.' },
    ],
    irregularModel: 'ser',
  },
  fut: {
    use: 'Zukunft (eher formell oder für fernere Pläne) und Vermutung über die Gegenwart („wird wohl …“).',
    formation:
      'Ganzer Infinitiv + -é, -ás, -á, -emos, -án (für alle drei Gruppen gleich). Verkürzte Stämme: tendré, haré, diré, podré, saldré, vendré, querré, sabré, pondré.',
    signals: 'mañana, el año que viene, algún día, dentro de',
    examples: [
      {
        es: 'El año que viene viviré en Barcelona.',
        de: 'Nächstes Jahr werde ich in Barcelona wohnen.',
      },
      { es: '¿Dónde estará Marta?', de: 'Wo Marta wohl ist?' },
      { es: 'Te lo diré mañana.', de: 'Ich sage es dir morgen.' },
    ],
    irregularModel: 'tener',
  },
  cond: {
    use: 'Höfliche Bitten und Wünsche, hypothetische Folgen („würde“), Ratschläge, Zukunft aus Sicht der Vergangenheit.',
    formation:
      'Ganzer Infinitiv + -ía, -ías, -ía, -íamos, -ían. Gleiche verkürzte Stämme wie im Futur: tendría, haría, diría, podría.',
    signals: 'en tu lugar, me gustaría, ¿podrías…?',
    examples: [
      { es: '¿Podrías ayudarme?', de: 'Könntest du mir helfen?' },
      { es: 'En tu lugar, hablaría con él.', de: 'An deiner Stelle würde ich mit ihm reden.' },
      { es: 'Me dijo que vendría.', de: 'Er sagte mir, er würde kommen.' },
    ],
    irregularModel: 'decir',
  },
  subj_pres: {
    use: 'Nach Auslösern für Wunsch, Gefühl, Zweifel, unpersönliche Urteile und bestimmte Konjunktionen (quiero que, me alegra que, para que, cuando + Zukunft) sowie nach ojalá.',
    formation:
      'Von der yo-Form des Präsens ausgehen, -o weglassen, „Gegenvokal“ anhängen. -ar: -e, -es, -e, -emos, -en · -er/-ir: -a, -as, -a, -amos, -an (tengo → tenga). Unregelmässig: ser (sea), ir (vaya), estar (esté), saber (sepa), haber (haya), dar (dé).',
    signals: 'quiero que, espero que, ojalá, para que, cuando (Zukunft), no creo que',
    examples: [
      { es: 'Quiero que vengas conmigo.', de: 'Ich will, dass du mitkommst.' },
      { es: 'Ojalá tengas suerte.', de: 'Hoffentlich hast du Glück.' },
      { es: 'Cuando llegues, llámame.', de: 'Wenn du ankommst, ruf mich an.' },
    ],
    irregularModel: 'tener',
  },
  imp_aff: {
    use: 'Bejahter Befehl oder Aufforderung. tú: direkt, usted/ustedes: höflich bzw. Mehrzahl, nosotros: „lass uns …“.',
    formation:
      'tú = 3. Person Singular Präsens (habla, come). usted, nosotros, ustedes = Formen des Subjuntivo presente (hable, hablemos, hablen). Unregelmässige tú-Formen: ten, haz, di, pon, sal, ven, ve, sé. Pronomen werden angehängt: dímelo.',
    examples: [
      { es: '¡Habla más despacio, por favor!', de: 'Sprich bitte langsamer!' },
      { es: 'Pase usted.', de: 'Treten Sie ein.' },
      { es: 'Ten cuidado.', de: 'Sei vorsichtig.' },
    ],
    irregularModel: 'tener',
  },
  imp_neg: {
    use: 'Verneinter Befehl („tu nicht …“, „lass uns nicht …“).',
    formation:
      'no + Subjuntivo presente für alle Personen (no hables, no hable, no hablemos, no hablen). Pronomen stehen vor dem Verb: no me lo digas.',
    examples: [
      { es: 'No hables tan alto.', de: 'Sprich nicht so laut.' },
      { es: 'No se preocupe.', de: 'Machen Sie sich keine Sorgen.' },
      { es: 'No tengas miedo.', de: 'Hab keine Angst.' },
    ],
    irregularModel: 'tener',
  },
  subj_imperf: {
    use: 'Subjuntivo der Vergangenheit: nach Auslösern in der Vergangenheit (quería que …), in irrealen si-Sätzen (si tuviera …), nach como si und für sehr höfliche Bitten (quisiera).',
    formation:
      'Von der ellos-Form des Indefinido ausgehen, -ron weglassen: tuvieron → tuvie- + -ra, -ras, -ra, -ramos (mit Akzent: tuviéramos), -ran. Die Form auf -se (tuviese) ist gleichwertig und wird als Alternative akzeptiert.',
    signals: 'si (irreal), como si, quería que, me pidió que',
    examples: [
      { es: 'Si tuviera tiempo, viajaría más.', de: 'Wenn ich Zeit hätte, würde ich mehr reisen.' },
      { es: 'Me pidió que lo ayudara.', de: 'Er bat mich, ihm zu helfen.' },
      { es: 'Habla como si lo supiera todo.', de: 'Er redet, als ob er alles wüsste.' },
    ],
    irregularModel: 'tener',
  },
  plusc: {
    use: 'Vorvergangenheit: Was vor einem anderen Ereignis in der Vergangenheit bereits geschehen war („hatte … gemacht“).',
    formation: 'haber im Imperfecto (había, habías, había, habíamos, habían) + Partizip.',
    signals: 'ya, todavía no, antes de que, cuando llegué',
    examples: [
      {
        es: 'Cuando llegué, la película ya había empezado.',
        de: 'Als ich ankam, hatte der Film schon angefangen.',
      },
      { es: 'Nunca había visto el mar.', de: 'Ich hatte noch nie das Meer gesehen.' },
    ],
    irregularModel: 'decir',
  },
  fut_perf: {
    use: 'Was bis zu einem Zeitpunkt in der Zukunft abgeschlossen sein wird, und Vermutung über die Vergangenheit („wird wohl … haben“).',
    formation: 'haber im Futur (habré, habrás, habrá, habremos, habrán) + Partizip.',
    signals: 'para mañana, dentro de un año, ya',
    examples: [
      {
        es: 'Para el lunes habré terminado el informe.',
        de: 'Bis Montag werde ich den Bericht fertig haben.',
      },
      { es: 'Habrá perdido el autobús.', de: 'Er wird wohl den Bus verpasst haben.' },
    ],
    irregularModel: 'hacer',
  },
  cond_comp: {
    use: 'Was unter anderen Umständen geschehen wäre („hätte … gemacht“), meist mit si + Subjuntivo pluscuamperfecto; auch Vermutung über die Vorvergangenheit.',
    formation: 'haber im Konditional (habría, habrías, habría, habríamos, habrían) + Partizip.',
    examples: [
      {
        es: 'Si lo hubiera sabido, te habría llamado.',
        de: 'Wenn ich es gewusst hätte, hätte ich dich angerufen.',
      },
      { es: 'Yo no lo habría dicho así.', de: 'Ich hätte es nicht so gesagt.' },
    ],
    irregularModel: 'decir',
  },
  subj_perf: {
    use: 'Subjuntivo für abgeschlossene Handlungen mit Gegenwartsbezug, nach den gleichen Auslösern wie der Subjuntivo presente.',
    formation: 'haber im Subjuntivo presente (haya, hayas, haya, hayamos, hayan) + Partizip.',
    signals: 'espero que, no creo que, me alegra que, ojalá',
    examples: [
      { es: 'Espero que hayas dormido bien.', de: 'Ich hoffe, du hast gut geschlafen.' },
      { es: 'No creo que lo haya visto.', de: 'Ich glaube nicht, dass er es gesehen hat.' },
    ],
    irregularModel: 'ver',
  },
  subj_plusc: {
    use: 'Irreale Vergangenheit: im si-Satz (si hubiera sabido …), nach ojalá für verpasste Wünsche und nach Auslösern in der Vergangenheit für Vorzeitiges.',
    formation:
      'haber im Subjuntivo imperfecto (hubiera, hubieras, hubiera, hubiéramos, hubieran) + Partizip. Die Form hubiese … ist gleichwertig.',
    signals: 'si (Vergangenheit irreal), ojalá, como si',
    examples: [
      {
        es: 'Si hubiera estudiado, habría aprobado.',
        de: 'Wenn ich gelernt hätte, hätte ich bestanden.',
      },
      { es: 'Ojalá hubieras venido.', de: 'Wärst du doch gekommen.' },
    ],
    irregularModel: 'hacer',
  },
};

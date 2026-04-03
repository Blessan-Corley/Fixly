import { logger } from '@/lib/logger';
import {
  ValidationSeverity,
  ViolationType,
  type ContentViolation,
} from '@/lib/validations/content/content.types';
import { getMatchesWithPositions } from '@/lib/validations/content/rules/policy';

const PROFANITY_DATABASE = {
  english: [
    'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'shit', 'shitting', 'shits', 'shitty',
    'damn', 'damned', 'dammit', 'bitch', 'bitching', 'bitches', 'bastard', 'bastards',
    'asshole', 'assholes', 'ass', 'asses', 'hell', 'hells', 'crap', 'crappy', 'craps',
    'piss', 'pissed', 'pissing', 'cock', 'cocks', 'dick', 'dicks', 'dickhead', 'dickheads',
    'pussy', 'pussies', 'slut', 'sluts', 'slutty', 'whore', 'whores', 'whorish',
    'motherfucker', 'motherfucking', 'motherfuckers', 'son of a bitch', 'goddamn',
    'goddamned', 'dumbass', 'dumbasses', 'jackass', 'jackasses', 'smartass', 'badass',
    'fatass', 'bullshit', 'horseshit', 'dipshit', 'shithead', 'shitheads', 'fuckface',
    'fuckfaces', 'cocksucker', 'cocksuckers', 'fucking hell', 'holy shit', 'what the fuck',
    'wtf', 'cunt', 'cunts', 'twat', 'twats', 'tits', 'titties', 'boobs', 'boobies', 'breasts',
    'penis', 'penises', 'vagina', 'vaginas', 'anal', 'anus', 'blowjob', 'blowjobs', 'handjob',
    'handjobs', 'orgasm', 'orgasms', 'masturbate', 'masturbation', 'sex', 'sexual', 'sexy',
    'horny', 'aroused', 'erection', 'climax', 'retard', 'retarded', 'retards', 'fag',
    'faggot', 'faggots', 'gay', 'nigger', 'nigga', 'niggas', 'spic', 'spics', 'chink',
    'chinks', 'gook', 'gooks', 'kike', 'kikes', 'wetback', 'wetbacks', 'beaner', 'beaners',
    'towelhead', 'towelheads', 'stupid', 'idiot', 'idiots', 'moron', 'morons', 'imbecile',
    'imbeciles', 'dumb', 'dumber', 'loser', 'losers', 'freak', 'freaks', 'creep', 'creeps',
    'pervert', 'perverts', 'sicko', 'sickos', 'weirdo', 'weirdos', 'psycho', 'psychos',
    'nutjob', 'nutjobs', 'fuk', 'fck', 'sht', 'btch', 'dum', 'stpd', 'fkn', 'shyt', 'azz',
    'biatch',
  ],
  tamil: [
    'punda', 'pundai', 'sunni', 'sunnis', 'koodhi', 'koodhis', 'ommala', 'ommalas', 'poda',
    'podi', 'maire', 'mairu', 'mairus', 'naaye', 'naayes', 'naay', 'paithiyam', 'paithiyams',
    'loose', 'aalu', 'aalus', 'kena', 'kenas', 'thevdiya', 'thevidiya', 'thevdiyas', 'poolu',
    'poulus', 'kunna', 'kunnas', 'myre', 'myres', 'thendi', 'thendis', 'para', 'paras',
    'otha', 'othas', 'othaiyya', 'othaiyyas', 'kenna', 'kennas', 'loosu', 'loosus', 'mental',
    'mentals', 'poda maire', 'podi maire', 'maire punda', 'sunni maire', 'koodhi maire',
    'naaye punda', 'thendi punda', 'loosu punda', 'mental punda', 'ommala punda', 'aalu punda',
    'kena punda', 'para punda', 'mandayan', 'mandayans', 'muttal', 'muttals', 'loose aalu',
    'mental aalu', 'thendi naaye', 'maire naaye', 'punda naaye', 'koodhi naaye',
  ],
  hindi: [
    'madarchod', 'madarchods', 'madharchod', 'behenchod', 'behenchods', 'bhenchod',
    'bhenchods', 'chutiya', 'chutiyas', 'chutiye', 'bhosdike', 'bhosadike', 'bhosadikes',
    'randi', 'randis', 'saala', 'saalas', 'sala', 'saali', 'saalis', 'kamina', 'kaminas',
    'kamine', 'harami', 'haramis', 'haramkhor', 'haramkhors', 'kutte', 'kuttes', 'kutta',
    'kuttas', 'gandu', 'gandus', 'gaandu', 'gaandus', 'lavde', 'lavdes', 'laude', 'laudes',
    'chodu', 'chodis', 'lund', 'lunds', 'bhosda', 'bhosdas', 'chut', 'chuts', 'gaand',
    'gaands', 'jhaant', 'jhaants', 'jhaat', 'jhaats', 'bhen ka loda', 'bhen ke lode',
    'bhen ke laude', 'ma ki chut', 'maa ki chut', 'behen ki chut', 'teri maa', 'teri behen',
    'teri gaand', 'maa chuda', 'behen chod', 'baap chod', 'gaand mara', 'lund choos',
    'randi ki aulad', 'randwa', 'randwas', 'chinaal', 'chinaals', 'kutiya', 'kutiyas',
    'kamini', 'kaminis', 'bc', 'mc', 'bkl', 'mkl', 'bhkl', 'chodu ram', 'madarchod saala',
    'behenchod harami', 'chodu panti', 'gandu aadmi', 'harami aurat', 'kamina aadmi',
    'randi aurat', 'saala kutta', 'madarchod kutta', 'bhosdike kamine', 'chutiya harami',
  ],
  malayalam: [
    'thendi', 'potta', 'myre', 'kunna', 'pooru', 'thayoli', 'maire', 'para', 'poda', 'podi',
    'myru', 'poorru', 'thendi mone', 'potta myre', 'kunna myre',
  ],
  telugu: [
    'dengey', 'lanjkoduku', 'lanjakoduku', 'boothulu', 'modda', 'puku', 'gulthi', 'gudda',
    'dengamma', 'rascal', 'waste fellow', 'lanjakodaki', 'badava', 'gadida', 'bokka',
    'sanka nakem',
  ],
  kannada: [
    'boli', 'boli maga', 'gubbu', 'bevarsi', 'nayi', 'kiru', 'sullu', 'waste', 'kelbedi',
    'muchko', 'bekku', 'kathe', 'chapri', 'loose', 'mental',
  ],
  marathi: [
    'madarchod', 'bhenchod', 'randi', 'lavda', 'lund', 'chut', 'gandu', 'chutiya', 'randya',
    'kutra', 'dongar', 'rascal', 'gadya', 'veda', 'pagal',
  ],
  gujarati: [
    'madarchod', 'behen no lodo', 'randi', 'lund', 'gandu', 'kutti', 'chutiya', 'gadhedo',
    'bokachodo', 'pela', 'vedio', 'dhakkan', 'kallu', 'bewakoof',
  ],
  punjabi: [
    'madarchod', 'bhenchod', 'randi', 'lund', 'gandu', 'chutiya', 'kamina', 'harami', 'kutte',
    'sala', 'bhosdike', 'pendu', 'gadhe', 'ullu', 'bekaar',
  ],
  bengali: [
    'madarchod', 'magir pola', 'chudna', 'rand', 'bal', 'chude', 'gandu', 'khankir chele',
    'tor maa', 'haram', 'gadha', 'pagol', 'mental', 'boka',
  ],
  variations: [
    'f*ck', 'f**k', 'sh*t', 's**t', 'b*tch', 'a**hole', 'p0rn', 's3x', 'fuk', 'fck', 'sht',
    'btch', 'dmn', 'd4mn', 'h3ll', 'cr4p', 'b1tch', 'a55', 'a55hole', 'fuc', 'fuk', 'phuck',
    'phuk', 'shiit', 'sh1t', 'b!tch', 'bit*h', 'da*n', 'd@mn', 'he||', 'cr@p',
  ],
  inappropriate: [
    'nazi', 'hitler', 'terrorist', 'isis', 'bomb', 'gun', 'weapon', 'kill', 'murder', 'death',
    'suicide', 'drug', 'cocaine', 'heroin', 'weed', 'marijuana', 'cannabis', 'meth', 'crack',
    'scam', 'fraud', 'casino', 'gambling', 'porn', 'xxx', 'sex', 'nude', 'naked', 'erotic',
    'adult', 'prostitute', 'escort', 'hooker',
  ],
};

const ALL_PROFANITY_WORDS = [
  ...PROFANITY_DATABASE.english,
  ...PROFANITY_DATABASE.tamil,
  ...PROFANITY_DATABASE.hindi,
  ...PROFANITY_DATABASE.malayalam,
  ...PROFANITY_DATABASE.telugu,
  ...PROFANITY_DATABASE.kannada,
  ...PROFANITY_DATABASE.marathi,
  ...PROFANITY_DATABASE.gujarati,
  ...PROFANITY_DATABASE.punjabi,
  ...PROFANITY_DATABASE.bengali,
  ...PROFANITY_DATABASE.variations,
  ...PROFANITY_DATABASE.inappropriate,
];

export function checkProfanity(content: string): ContentViolation[] {
  const violations: ContentViolation[] = [];
  const lowerContent = content.toLowerCase();

  for (const word of ALL_PROFANITY_WORDS) {
    try {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      const matches = getMatchesWithPositions(lowerContent, regex);

      matches.forEach(({ match, index }) => {
        violations.push({
          type: ViolationType.ABUSE,
          severity: ValidationSeverity.CRITICAL,
          message: 'Inappropriate language detected',
          match,
          position: index,
          suggestion: 'Please use respectful and professional language',
        });
      });
    } catch (error: unknown) {
      logger.warn(
        { error: error instanceof Error ? error.message : String(error), word },
        'Profanity check error'
      );
    }
  }

  return violations;
}

// Question 1: Session Flow
// A request uses a controller, an associated service, and model objects; see src/app.ts.
// Question 2: Object (More Details)
export function profileObjects() {
  const profile = { username: 'learner', bio: '', label() { return this.username; } };
  const reference = profile;
  reference.bio = 'Learning TypeScript';
  return { profile, reference, copy: { ...profile } };
}
// Question 3: Function
export const formatNames = (names: string[], format: (name: string) => string): string[] => names.map(format);
export async function loadLabel(load: () => Promise<string>): Promise<string> { return `User: ${await load()}`; }
// Question 6: What Is Association — Aggregation and Composition?
export class ProfileCard {
  // Composition: this card constructs and owns its style object.
  private readonly style = { prefix: '@' };
  // Aggregation: the supplied profile exists independently of this card.
  constructor(public readonly profile: { username: string }) {}
  label() { return this.style.prefix + this.profile.username; }
}
// Question 7: Encapsulation and Access Modifiers
// Question 14: Static Property and Methods
// Question 15: Getter and Setter (Private)
export class DisplayLabel {
  static readonly maxLength = 80;
  private value = '';
  protected prefix = '@';
  constructor(value: string) { this.label = value; }
  public get label() { return this.value; }
  public set label(value: string) {
    if (!value.trim() || value.length > DisplayLabel.maxLength) throw new RangeError('Invalid label');
    this.value = value.trim();
  }
  static from(value: string) { return new DisplayLabel(value); }
  render() { return this.prefix + this.label; }
}
// Question 13: Overwrite vs Override
export class PrivateLabel extends DisplayLabel {
  override render() { return `${super.render()} (private)`; }
}
// An override specializes an inherited method. Assignment replaces an object's property value.
export function replaceRenderer(label: DisplayLabel) { label.render = () => 'replacement'; }

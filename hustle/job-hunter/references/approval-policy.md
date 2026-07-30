# Approval policy

Apply the candidate profile's stored policy. If it is absent or ambiguous,
default to review mode.

## Research mode

Allow searching public job sources, reading company and portfolio information,
scoring and recording opportunities, and generating local drafts. Do not fill
authenticated forms, send messages, or submit applications.

## Review mode

Allow all research actions plus form filling, resume upload, and message
drafting. Pause at the final external action: application submission, email
send, direct-message send, scheduled send, or offer acceptance.

One approval covers only the presented target and materially unchanged content.

## Autopilot mode

Allow external actions only when every condition is covered by explicit stored
rules. Stop on any exception. Record the rule that authorized the action and
verification evidence.

Autopilot must still stop for:

- salary, rate, equity, or availability commitments outside stored ranges;
- work authorization, sponsorship, relocation, legal declarations, consent,
  background checks, or binding terms;
- demographic, disability, veteran, criminal-history, or other sensitive
  questions unless the profile contains an explicit answer and permission;
- a required qualification that cannot be supported;
- requests for payment, banking details, identity documents, credentials, or
  suspicious downloads;
- assessments, recorded video, reference requests, or interviews.

## Truthfulness

Never infer a favorable answer to a factual screening question. Use verified
evidence, answer truthfully, or stop. Do not convert adjacent experience into
claimed years, production usage, certification, or employment.

## Compensation

Distinguish an advertised range, a candidate preference used for filtering,
and a stated expectation that becomes a commitment. If compensation is
flexible, preserve flexibility and do not automatically enter the lowest
possible number. Flag below-floor jobs before doing application work.

## Confirmation

An automation command returning success proves only that the command ran.
Require visible or machine-readable evidence that the platform accepted the
application or message.

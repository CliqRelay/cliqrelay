duration
Represents a positive or negative span of time.

Constructor
Creates a new duration.

You can specify the duration using weeks, days, hours, minutes and seconds. You can also get a duration by subtracting two datetimes.

duration(
seconds: int,
minutes: int,
hours: int,
days: int,
weeks: int,
) → duration
seconds
int
Default: 0
The number of seconds.

minutes
int
Default: 0
The number of minutes.

hours
int
Default: 0
The number of hours.

days
int
Default: 0
The number of days.

weeks
int
Default: 0
The number of weeks.

Definitions
seconds
The duration expressed in seconds.

This function returns the total duration represented in seconds as a floating-point number, rather than the seconds component of the duration.

self.seconds() → float
minutes
The duration expressed in minutes.

This function returns the total duration represented in minutes as a floating-point number, rather than the minutes component of the duration.

self.minutes() → float
hours
The duration expressed in hours.

This function returns the total duration represented in hours as a floating-point number, rather than the hours component of the duration.

self.hours() → float
days
The duration expressed in days.

This function returns the total duration represented in days as a floating-point number, rather than the days component of the duration.

self.days() → float
weeks
The duration expressed in weeks.

This function returns the total duration represented in weeks as a floating-point number, rather than the weeks component of the duration.

self.weeks() → float

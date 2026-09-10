phase 1.1 (physics and character controls)
- properties
  -position
  -mass
  -2d velocity
  -vertical velocity
  -readonly isAboveGround
  -readonly isAboveWalls
  -collider radius
  -static ground friction mod
  -dynamic ground friction mod
  -bounce mod (removable)
- behavior
  -update position

character
- inherits from object
- modular(removable) walking function (applies friction force in opposite direction of movement input)
- modular pickup and throw item abilities(click at first contact location) with calculated trajectory

no hp, energy, power yet. just walking around and throwing things

height rings-all objects at same height have the same ring size

roll resistance
-how much momentum is lost when not above ground
-3d angular velocity vector
-animated outline

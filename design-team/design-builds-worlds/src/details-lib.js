// A library of hidden details for the regions: 31 that any region can have (with the 9 in details.js: 40), and 10 for each biome.
// Each detail is a few small shapes. One line = one detail:
//   id : label : where : move : shapes
// where: g = on the ground, w = it floats on water, a = in the air.
// move (what it does when a visitor finds it): hop, spin, wig (it rocks), grow.
// shapes, with | between them: a letter, its sizes, a color, then x y z (0 if not given), then options (rx ry rz = turn, t = taper, sx sy sz = stretch).
//   b = box w h d    c = cylinder r h    s = ball r    k = cone r h    p = pyramid w h d    d = dome r h
// colors: A and S = the two accent colors of the region, W = white, K = dark, or a palette row and a tone (re5 = red, tone 5). A * at the end = it glows.
import { ROW } from './palette.js';

const ROWS = { ne: 'neutral', re: 'red', or: 'orange', ye: 'yellow', gn: 'green', bl: 'blue', pu: 'purple', pk: 'pink', ea: 'earth', sa: 'sand', fo: 'forest', gr: 'grass', ro: 'rock', sn: 'snow', se: 'sea', au: 'autumn', co: 'coral', am: 'amethyst', pl: 'plaster', ol: 'olive', db: 'darkblue' };

const UNIVERSAL = `
lantern:a paper lantern:g:wig:c .003 .05 ea7|b .022 .026 .022 re4* 0 .05|b .026 .004 .026 K 0 .076|b .026 .004 .026 K 0 .046
gnome:a garden gnome:g:hop:b .018 .02 .014 bl5|b .014 .012 .012 sa2 0 .02|b .016 .008 .008 W 0 .016 .006|k .011 .028 re5 0 .032
birdhouse:a birdhouse:g:wig:c .003 .06 ea7|b .024 .022 .02 A 0 .06|p .03 .014 .026 S 0 .082|c .004 .003 K 0 .068 .011 rx1.57
signpost:a signpost:g:spin:c .003 .06 ea7|b .034 .01 .004 W .012 .05|b .034 .01 .004 A -.012 .036
telescope:a telescope on a stand:g:spin:c .002 .04 K .01 0 0 rz.3|c .002 .04 K -.01 0 0 rz-.3|c .002 .04 K 0 0 .01 rx-.3|c .007 .04 A 0 .04 0 rz1.1
wheelbarrow:a wheelbarrow:g:hop:b .03 .014 .022 A 0 .012|c .009 .004 K .02 0 0 rx1.57|b .03 .003 .003 ea7 -.024 .016 .009|b .03 .003 .003 ea7 -.024 .016 -.009
bench:a small bench:g:hop:b .044 .004 .014 ea6 0 .014|b .044 .012 .003 ea6 0 .02 -.007|b .004 .014 .012 K .018|b .004 .014 .012 K -.018
birdbath:a bird bath:g:grow:c .006 .03 pl2|c .018 .006 pl2 0 .03|c .014 .002 se3 0 .036|s .005 re5 .008 .04
beehive:a beehive:g:wig:c .016 .01 ye5|c .014 .01 ye4 0 .01|c .011 .01 ye5 0 .02|c .007 .008 ye4 0 .03|b .006 .006 .004 K 0 .004 .015
weathervane:a weather vane:g:spin:c .002 .06 K|b .036 .003 .003 K 0 .05|p .012 .012 .004 A .02 .044 0 rz-1.57|b .012 .014 .003 A -.016 .046
doghouse:a dog house:g:hop:b .032 .024 .034 A|p .04 .018 .04 S 0 .024|b .012 .016 .004 K 0 0 .017|b .012 .004 .004 W 0 .02 .018
teapot:a teapot:g:wig:s .016 A 0 0 0 sy.8|c .006 .004 S 0 .024|b .012 .004 .004 A .018 .012 0 rz.5|c .008 .003 A -.018 .008 0 rx1.57
books:a stack of books:g:hop:b .028 .006 .02 re5|b .026 .006 .018 bl5 .001 .006 0 ry.2|b .024 .006 .018 gn5 0 .012 0 ry-.15|b .02 .005 .016 ye4 .001 .018
guitar:a guitar:g:wig:c .012 .005 ea5 0 .012 0 rx1.57|c .009 .005 ea5 0 .028 0 rx1.57|b .004 .034 .004 ea7 0 .036|c .004 .002 K 0 .014 .003 rx1.57
drum:a drum:g:hop:c .016 .018 A|c .017 .003 W 0 .018|c .017 .003 W|c .002 .024 ea7 .012 .022 0 rz.7|c .002 .024 ea7 -.012 .022 0 rz-.7
rockinghorse:a rocking horse:g:wig:b .034 .004 .012 ea6|b .024 .012 .01 S 0 .012|b .008 .014 .008 S .012 .022 0 rz-.4|b .01 .006 .008 S .018 .032|b .003 .012 .003 K -.012 .02 0 rz.6
toytrain:a toy train:g:hop:b .03 .012 .014 A 0 .006|b .012 .012 .014 S -.01 .018|c .005 .012 K .009 .018|c .005 .004 K .009 0 .007 rx1.57|c .005 .004 K -.009 0 .007 rx1.57
robot:a small robot:g:spin:b .018 .02 .014 ne4 0 .01|b .014 .012 .012 ne3 0 .03|b .004 .004 .002 ye3* .003 .036 .006|b .004 .004 .002 ye3* -.003 .036 .006|c .001 .01 K 0 .042|b .005 .01 .005 ne5 .006|b .005 .01 .005 ne5 -.006
gramophone:a gramophone:g:spin:b .026 .01 .026 ea7|c .012 .002 K 0 .01|k .016 .026 ye4 .006 .016 0 rz-.9|c .002 .014 ye5 .004 .012
globe:a globe on a stand:g:spin:c .01 .004 ea7|c .002 .016 ea7 0 .004|s .014 se5 0 .02|b .012 .008 .004 gn5 .002 .032 .011
chesspiece:a chess knight:g:hop:c .011 .005 K|c .007 .014 K 0 .005|b .009 .016 .008 K .002 .019 0 rz-.3|b .012 .007 .007 K .006 .03|p .004 .006 .004 K 0 .037
crown:a lost crown:g:spin:c .014 .01 ye4|p .006 .01 .006 ye4 .01 .01|p .006 .01 .006 ye4 -.01 .01|p .006 .01 .006 ye4 0 .01 .01|p .006 .01 .006 ye4 0 .01 -.01|s .003 re5 0 .006 .014
key:a large golden key:g:spin:c .009 .004 ye4 0 .03 0 rx1.57|b .004 .03 .004 ye4 0 .002|b .01 .004 .004 ye4 .005 .004|b .008 .004 .004 ye4 .004 .012
sundial:a sundial:g:grow:c .008 .016 pl3|c .02 .004 pl2 0 .016|p .003 .016 .014 K 0 .02 0|b .003 .001 .012 ye4 .01 .0205
hourglass:an hourglass:g:spin:c .012 .003 ea7|k .01 .016 se2 0 .019 0 rx3.14|k .01 .016 se2 0 .019|c .012 .003 ea7 0 .035|s .004 sa3 0 .006
candle:a candle that burns:g:grow:c .012 .004 ye5|c .006 .03 W 0 .004|k .004 .012 or4* 0 .036|k .002 .007 ye2* 0 .037
cake:a birthday cake:g:hop:c .02 .012 pk3|c .021 .004 W 0 .012|c .013 .01 pk4 0 .016|c .0015 .012 W 0 .026|k .002 .005 ye3* 0 .038
gift:a gift box:g:hop:b .026 .022 .026 A|b .028 .005 .028 S 0 .022|b .005 .028 .028 W 0 0|b .028 .028 .005 W 0 0|s .006 W 0 .03
wateringcan:a watering can:g:wig:c .013 .022 gn5|c .003 .026 gn5 .018 .01 0 rz-.8|b .004 .014 .004 gn6 -.016 .012|k .006 .006 gn6 .028 .026 0 rz-2.3
pinwheel:a toy pinwheel:g:spin:c .002 .05 W|b .026 .008 .002 A 0 .046|b .008 .026 .002 S 0 .037|s .003 ye3 0 .048 .002
trophy:a golden trophy:g:spin:b .018 .006 .018 K|c .003 .012 ye4 0 .006|k .014 .02 ye4 0 .038 0 rx3.14|b .004 .01 .003 ye4 .016 .026|b .004 .01 .003 ye4 -.016 .026
`;

const BY_BIOME = {
  forest: `
toadstool:a red toadstool:g:grow:c .005 .016 W|d .016 .012 re5 0 .016|s .003 W .007 .024 .004|s .003 W -.006 .023 -.004
owl:an owl on a stump:g:wig:c .012 .016 ea7|b .016 .02 .014 ea5 0 .016|b .018 .008 .014 ea6 0 .036|s .004 ye3 .004 .036 .007|s .004 ye3 -.004 .036 .007|p .004 .005 .004 or5 0 .031 .008
acorn:a large acorn:g:spin:s .012 ea5 0 0 0 sy1.2|d .013 .008 ea7 0 .014|c .002 .006 ea8 0 .022
stumpaxe:an axe in a tree stump:g:wig:c .02 .016 ea6|c .016 .002 sa3 0 .016|b .003 .034 .003 ea7 .004 .018 0 rz-.5|b .014 .012 .004 ne4 .016 .04 0 rz-.5
squirrel:a squirrel:g:hop:b .014 .012 .01 or6|b .01 .01 .009 or6 .008 .012|b .008 .022 .008 or5 -.012 .006 0 rz.3|s .0025 K .012 .018 .004
hollowlog:a hollow log:g:wig:c .016 .05 ea6 0 .016 0 rz1.57|c .011 .052 K 0 .016 0 rz1.57|s .005 gn5 .01 .032 .006
hedgehog:a hedgehog:g:hop:s .014 ea7 0 0 0 sy.8|k .008 .012 sa3 .014 .008 0 rz-1.57|s .0025 K .018 .012 .003|p .004 .008 .004 ea8 -.004 .018|p .004 .008 .004 ea8 .004 .018 .004
nest:a nest with eggs:g:grow:c .018 .008 ea6|c .014 .003 ea8 0 .008|s .005 se2 .004 .012|s .005 se2 -.005 .012 .002|s .005 se2 0 .012 -.005
firewood:a pile of firewood:g:hop:c .006 .04 ea6 0 .006 -.008 rz1.57|c .006 .04 ea5 0 .006 .006 rz1.57|c .006 .04 ea6 0 .017 0 rz1.57|c .0055 .002 sa3 .02 .006 .006 rz1.57
pinecone:a giant pine cone:g:spin:k .014 .01 ea7|k .013 .012 ea6 0 .008|k .011 .012 ea7 0 .016|k .008 .012 ea6 0 .024`,
  desert: `
cattleskull:a cattle skull:g:wig:b .016 .014 .012 pl1 0 .004|b .01 .01 .01 pl1 0 0 .012|k .004 .02 pl2 .014 .014 0 rz-1.1|k .004 .02 pl2 -.014 .014 0 rz1.1|b .003 .003 .002 K .004 .012 .007|b .003 .003 .002 K -.004 .012 .007
tumbleweed:a tumbleweed:g:spin:s .018 sa5 0 .004|s .013 ea5 .004 .008 .004|s .012 sa6 -.005 .006 -.004
genielamp:a genie lamp:g:grow:s .013 ye4 0 0 0 sy.6 sx1.4|k .005 .018 ye4 .018 .008 0 rz-1.2|c .005 .004 ye5 0 .012|b .004 .012 .003 ye5 -.018 .008|s .006 pu3* .03 .024
scorpion:a scorpion:g:wig:b .018 .006 .012 ea8 0 .003|b .005 .005 .005 ea8 -.012 .008|b .005 .005 .005 ea8 -.016 .014|k .003 .008 ea9 -.014 .02 0 rz-1|b .008 .004 .004 ea8 .014 .004 .008|b .008 .004 .004 ea8 .014 .004 -.008
waterjug:a clay water jug:g:wig:s .015 or6 0 .002 0 sy1.2|c .006 .01 or6 0 .03|c .008 .003 or7 0 .04|b .004 .014 .003 or7 .014 .022
vulture:a vulture on a branch:g:wig:c .003 .04 ea8|b .03 .003 .003 ea8 0 .036|b .014 .018 .012 K .006 .04|s .006 pk3 .01 .062|p .004 .006 .004 ye4 .016 .06 0 rz-1.57
snake:a coiled snake:g:spin:c .018 .006 ol6|c .013 .006 ol5 0 .006|c .008 .006 ol6 0 .012|b .008 .006 .008 ol5 .006 .02|b .002 .001 .006 re5 .012 .021
wagonwheel:an old wagon wheel:g:spin:c .022 .004 ea7 0 .022 0 rx1.57|c .016 .005 sa3 0 .022 0 rx1.57|c .005 .008 ea8 0 .022 0 rx1.57|b .04 .003 .003 ea7 0 .0205|b .003 .04 .003 ea7 0 .002
pickaxe:a pickaxe in the ground:g:wig:b .003 .05 .003 ea7 0 0 0 rz.3|b .04 .005 .005 ne5 -.014 .046 0 rz.3
fossil:a fossil in a rock:g:grow:s .024 ro4 0 -.006 0 sy.5|c .01 .002 pl1 0 .008|c .006 .003 pl2 .002 .009|b .012 .002 .003 pl1 -.012 .008 0 ry.5`,
  tundra: `
skis:a pair of skis in the snow:g:wig:b .004 .05 .002 re5 -.006 0 0 rz.12|b .004 .05 .002 re5 .006 0 0 rz-.12|c .0015 .04 K .016|c .0015 .04 K -.016
husky:a sled dog:g:hop:b .028 .014 .012 ne5 0 .01|b .012 .012 .011 ne4 .018 .02|b .006 .01 .004 W .019 .014 .006|p .004 .006 .003 ne5 .015 .032 .004|p .004 .006 .003 ne5 .021 .032 -.004|b .004 .012 .004 ne5 -.016 .02 0 rz.6
mitten:a lost wool mitten:g:hop:b .016 .02 .008 re5 0 .004|b .016 .006 .009 W 0 0|b .006 .01 .008 re5 .011 .008 0 rz-.5
icesculpture:an ice sculpture of a swan:g:spin:b .024 .006 .016 se1|s .012 se2 0 .012 0 sx1.3|c .003 .022 se2 .012 .014 0 rz-.3|b .008 .005 .005 se1 .018 .034
snowshovel:a snow shovel:g:wig:b .003 .046 .003 ea7 0 0 0 rz.2|b .016 .016 .003 re5 -.004 0 0 rz.2|s .012 sn0 .014 -.004 0 sy.6
seal:a seal on the ice:g:hop:c .022 .003 se1|s .014 ne5 0 .004 0 sx1.6 sy.8|s .008 ne5 .02 .014|b .012 .003 .01 ne6 -.024 .004|s .002 K .026 .018 .004
thermometer:a frozen thermometer:g:grow:c .003 .05 W|s .006 re5 0 .002|c .0015 .014 re5 0 .008|b .01 .002 .002 K .004 .03
frozenfish:a fish in a block of ice:g:spin:b .034 .024 .02 se1|b .018 .008 .004 or5 0 .008|p .008 .008 .004 or5 -.012 .008 0 rz1.57
snowglobe:a snow globe:g:spin:c .014 .006 re5|s .015 se1 0 .008|k .005 .012 fo6 0 .008|c .002 .004 ea7 0 .006
reindeer:a small reindeer:g:hop:b .024 .012 .01 ea6 0 .016|b .01 .01 .009 ea6 .016 .026|b .004 .016 .004 ea7 .008|b .004 .016 .004 ea7 -.008|b .002 .012 .002 sa3 .014 .036 .004 rz-.4|b .002 .012 .002 sa3 .014 .036 -.004 rz.4|s .003 re5* .022 .03`,
  wetland: `
dragonfly:a dragonfly:a:spin:b .004 .004 .034 se5|b .026 .001 .008 se1 0 .003 .006|b .026 .001 .008 se1 0 .003 -.004|s .004 se6 0 0 .018
turtle:a turtle:g:hop:d .016 .012 ol6|b .008 .006 .008 gr5 .016 .004|b .006 .004 .006 gr5 .01 0 .012|b .006 .004 .006 gr5 .01 0 -.012|b .006 .004 .006 gr5 -.01 0 .012|b .006 .004 .006 gr5 -.01 0 -.012
crocodile:the eyes of a crocodile:w:hop:b .04 .006 .016 ol7 0 -.002|b .018 .005 .012 ol7 .024 -.002|s .004 ol6 -.002 .006 .005|s .004 ol6 -.002 .006 -.005|s .002 ye3 -.002 .008 .006|s .002 ye3 -.002 .008 -.006
waterlily:a water lily in flower:w:grow:c .022 .003 gr5|k .01 .01 pk2 0 .003|k .006 .012 pk3 0 .005|s .003 ye3 0 .014
fishingrod:a fishing rod with a float:g:wig:c .0015 .07 ea7 0 0 0 rz-.6|c .0006 .04 W .04 .018|s .004 re5 .04 .016
rubberboots:a pair of rubber boots:g:hop:b .009 .022 .009 ye4 -.007|b .009 .006 .016 ye4 -.007 0 .005|b .009 .022 .009 ye4 .007 0 0 rz-.2|b .009 .006 .016 ye4 .009 0 .005
fireflyjar:a jar of fireflies:g:grow:c .011 .024 se1|c .012 .004 ea7 0 .024|s .003 ye2* .003 .01|s .003 ye2* -.004 .016 .002|s .003 ye2* .001 .02 -.003
paddle:a lost paddle:g:wig:b .003 .05 .003 ea6 0 0 0 rz.5|b .012 .018 .003 A -.026 .046 0 rz.5
snail:a snail:g:hop:b .024 .005 .008 sa3|s .01 or5 -.003 .01 0 sx.6|c .001 .008 sa3 .01 .005 .002|c .001 .008 sa3 .01 .005 -.002
beaverdam:a beaver dam:w:wig:c .004 .05 ea7 0 .004 0 rz1.57|c .004 .044 ea6 0 .01 .008 rz1.5|c .004 .04 ea7 0 .012 -.008 rz1.65|b .014 .01 .01 ea8 0 .018|b .01 .003 .014 ea9 -.012 .018`,
  volcanic: `
lavalamp:a lava lamp:g:grow:k .01 .012 ne6|c .008 .03 or4* 0 .01|s .005 ye2* 0 .022|k .008 .01 ne6 0 .04
obsidian:an obsidian shard:g:spin:p .014 .04 .012 ne9 0 0 0 rz.15|p .008 .022 .008 ne8 .012 0 .004 rz-.3|p .006 .016 .006 pu8 -.01 0 -.004
phoenixegg:a phoenix egg:g:grow:c .018 .006 ro8|s .014 or4* 0 .012 0 sy1.3|b .004 .016 .004 ye2* .004 .012 .012|b .004 .01 .004 ye2* -.006 .016 .011
rockhammer:a geologist hammer:g:wig:b .003 .04 .003 ea6 0 0 0 rz.4|b .02 .006 .006 ne5 -.014 .036 0 rz.4|s .01 ro8 .016 0 .006 sy.6
steamvent:a steam vent:g:grow:c .014 .008 ro8|c .008 .009 K|s .008 W 0 .018|s .01 W .004 .034|s .007 pl1 -.003 .052
charredstump:a charred tree stump:g:wig:c .014 .03 ne9|b .004 .02 .004 ne9 .01 .024 0 rz-.6|s .004 or4* 0 .03|s .003 ye2* .004 .012 .012
magmacrab:a magma crab:g:hop:b .022 .01 .016 ro8 0 .006|b .01 .003 .006 or4* 0 .016|b .01 .008 .006 ro7 .016 .01 .008|b .01 .008 .006 ro7 .016 .01 -.008|s .002 ye2* .01 .016 .004|s .002 ye2* .01 .016 -.004
seismograph:a seismograph:g:wig:b .034 .008 .02 ne6|c .008 .022 W 0 .014 0 rz1.57|b .002 .014 .002 re5 .004 .022 .008|b .01 .012 .012 ne5 -.016 .008
fireflower:a fire flower:g:grow:c .002 .03 ro8|k .008 .014 or4* 0 .03|k .005 .014 ye2* 0 .034|b .012 .003 .004 ro7 .006 .012 0 rz.5
sulfur:a sulfur crystal:g:spin:p .014 .026 .012 ye3|p .01 .018 .008 ye4 .01 0 .004 rz-.4|p .008 .014 .008 ye2 -.008 0 -.006 rz.4`,
  archipelago: `
coconut:a coconut with a straw:g:hop:s .014 ea7 0 .002|c .009 .002 W 0 .014|c .0015 .022 re4 .004 .012 0 rz-.3|b .012 .002 .01 pk3 -.006 .018 0 rz.4
starfish:a starfish:g:spin:c .006 .004 or4|b .026 .004 .007 or4|b .026 .004 .007 or4 0 0 0 ry1.26|b .026 .004 .007 or4 0 0 0 ry2.51
crab:a red crab:g:hop:b .02 .008 .014 re5 0 .004|b .008 .008 .006 re5 .014 .008 .01|b .008 .008 .006 re5 .014 .008 -.01|c .001 .008 re6 .006 .012 .004|c .001 .008 re6 .006 .012 -.004
treasuremap:a treasure map:g:grow:b .034 .002 .026 sa2|b .004 .0025 .004 re5 .008 0 .004|b .012 .0025 .002 K -.004 0 -.004|c .004 .03 sa3 -.02 .004 0 rx1.57
pirateflag:a pirate flag:g:wig:c .002 .07 ea7|b .03 .02 .002 K .016 .048|s .004 W .016 .058 .002|b .008 .002 .002 W .016 .052 .002
seashell:a spiral seashell:g:spin:k .014 .012 pk2 0 .004 0 rz1.57|s .009 pk3 -.008 .008|s .005 pk2 -.016 .007
parrot:a parrot on a perch:g:wig:c .002 .04 ea7|b .024 .003 .003 ea7 0 .04|b .012 .02 .01 re5 0 .043|b .008 .016 .004 bl5 -.006 .04 0 rz.3|p .005 .006 .004 ye4 .009 .058 0 rz-1.57
hammock:a hammock:g:wig:c .003 .04 ea7 .03|c .003 .04 ea7 -.03|b .056 .003 .018 A 0 .02|b .012 .006 .014 W -.016 .023
shipwheel:a ship wheel in the sand:g:spin:c .02 .004 ea6 0 .02 0 rx1.57|c .013 .005 sa3 0 .02 0 rx1.57|b .05 .003 .003 ea7 0 .0185|b .003 .05 .003 ea7 0 -.005|b .036 .003 .003 ea7 0 .0185 0 rz.78
lobstertrap:a lobster trap:g:hop:b .034 .018 .022 ea5|b .036 .003 .024 ea7 0 .018|b .003 .018 .024 ea7 .012|b .003 .018 .024 ea7 -.012|b .01 .004 .006 re5 0 .004 .012`,
  meadow: `
butterfly:a butterfly:a:wig:b .003 .003 .016 K|b .014 .001 .012 A .008 .002 .003 rz.5|b .014 .001 .012 A -.008 .002 .003 rz-.5|b .01 .001 .008 S .006 .002 -.007 rz.5|b .01 .001 .008 S -.006 .002 -.007 rz-.5
ladybug:a ladybug on a leaf:g:hop:b .03 .002 .018 gr5|d .01 .008 re5 0 .002|s .004 K .009 .004|s .002 K -.002 .009 .004|s .002 K -.003 .009 -.004
daisychain:a daisy chain:g:spin:c .02 .002 gr5|s .005 W .016 .002|s .005 W -.016 .002|s .005 W 0 .002 .016|s .005 W 0 .002 -.016|s .0025 ye3 .016 .006|s .0025 ye3 -.016 .006
rabbithole:a rabbit in a hole:g:hop:c .016 .004 ea7|c .011 .005 K|s .009 W 0 .008|b .003 .016 .003 W .004 .014|b .003 .016 .003 W -.004 .014|s .002 pk3 0 .01 .008
milkchurn:a milk churn:g:wig:c .012 .026 ne3|k .012 .01 ne3 0 .026|c .007 .008 ne4 0 .03|c .009 .003 ne4 0 .038|b .004 .008 .003 ne5 .013 .02
haybale:a round hay bale:g:spin:c .02 .03 ye4 0 .02 0 rz1.57|c .0205 .004 ye5 .008 .02 0 rz1.57|c .0205 .004 ye5 -.008 .02 0 rz1.57
butterflynet:a butterfly net:g:wig:c .002 .06 ea6 0 0 0 rz.5|c .012 .002 W -.034 .054 0 rz.5|k .012 .02 W -.028 .034 0 rz3.6
sheepbell:a sheep bell on a post:g:wig:c .003 .04 ea7|b .02 .003 .003 ea7 .008 .038|k .009 .014 ye5 .016 .022|s .003 K .016 .02
clover:a four-leaf clover:g:spin:c .0015 .016 gr6|s .007 gr4 .006 .018 0 sy.4|s .007 gr4 -.006 .018 0 sy.4|s .007 gr4 0 .018 .006 sy.4|s .007 gr4 0 .018 -.006 sy.4
molehill:a mole in a molehill:g:hop:k .022 .014 ea7|s .008 ne8 0 .014|s .003 pk3 .006 .016|b .006 .003 .004 pk3 .008 .01 .006|b .006 .003 .004 pk3 .008 .01 -.006`,
  canyon: `
goldpan:a gold pan with gold:g:spin:c .02 .004 ne5|c .016 .002 se3 0 .004|s .003 ye3* .004 .006|s .0025 ye3* -.005 .006 .003|s .002 ye3* 0 .006 -.006
lasso:a lasso on a post:g:spin:c .003 .04 ea7|c .012 .003 sa4 0 .03 0 rx.5|c .012 .003 sa4 0 .024 0 rx.3|c .0015 .02 sa4 .012 .01 0 rz.3
cowboyboot:a cowboy boot:g:hop:b .012 .026 .012 ea6|b .012 .008 .022 ea6 0 0 .006|b .013 .004 .013 ea8 0 .026|b .004 .006 .002 ye4 0 .004 -.008
dinobone:a dinosaur bone:g:wig:c .005 .046 pl1 0 .006 0 rz1.57|s .008 pl1 .024 .008 .004|s .008 pl1 .024 .008 -.004|s .008 pl1 -.024 .008 .004|s .008 pl1 -.024 .008 -.004
minecart:a mine cart with ore:g:hop:b .032 .016 .022 ne6 0 .008|b .028 .006 .018 ro7 0 .022|s .004 ye3* .006 .028|s .004 ye3* -.006 .027 .004|c .006 .004 K .01 0 .011 rx1.57|c .006 .004 K -.01 0 .011 rx1.57
horseshoe:a lucky horseshoe:g:spin:b .006 .024 .004 ne5 .01 .004|b .006 .024 .004 ne5 -.01 .004|b .026 .006 .004 ne5 0 .026
roadrunner:a roadrunner:g:hop:b .02 .01 .008 se6 0 .018 0 rz.2|b .008 .008 .006 se6 .014 .026|p .003 .01 .003 or5 .022 .028 0 rz-1.57|b .016 .003 .004 se7 -.018 .024 0 rz.5|c .001 .018 or5 .002|c .001 .018 or5 -.004 0 .003
dynamite:a crate of dynamite:g:grow:b .03 .016 .022 ea6|c .004 .022 re5 -.007 .016|c .004 .022 re5 .001 .016|c .004 .022 re5 .009 .016|s .003 ye2* .009 .042
canteen:a canteen:g:wig:c .014 .008 ol6 0 .014 0 rx1.57|c .004 .008 ne5 0 .028|c .0155 .003 ea7 0 .014 0 rx1.57|c .001 .02 ea7 .01 .028 0 rz-.6
eaglenest:an eagle nest:g:grow:c .024 .008 ea7|c .018 .004 ea8 0 .008|b .012 .016 .01 ea8 0 .012|s .006 W .002 .03|p .004 .005 .003 ye4 .008 .029 0 rz-1.57`,
  jungle: `
toucan:a toucan:g:wig:c .002 .03 ea7|b .012 .02 .01 K 0 .03|b .008 .008 .008 W .004 .044|b .02 .007 .005 or4 .016 .046|s .002 K .006 .05 .004
bananas:a bunch of bananas:g:hop:b .006 .026 .006 ye3 -.006 0 0 rz.25|b .006 .028 .006 ye3 0 0 0|b .006 .026 .006 ye3 .006 0 0 rz-.25|b .008 .006 .006 ea7 0 .028
monkey:a small monkey:g:hop:b .014 .016 .012 ea6 0 .006|s .009 ea6 0 .028|s .006 sa3 .003 .027 .005|s .004 ea6 .008 .03|s .004 ea6 -.008 .03|c .002 .03 ea6 -.01 .004 0 rz.9
stoneidol:an old stone idol:g:grow:b .022 .034 .02 ro5|b .026 .008 .022 ro6 0 .034|b .005 .005 .003 K .005 .024 .01|b .005 .005 .003 K -.005 .024 .01|b .01 .004 .003 K 0 .012 .01|s .006 gr5 .01 .04 .004
vineswing:a vine swing:g:wig:c .0015 .06 gr6 .012|c .0015 .06 gr6 -.012|b .03 .003 .01 ea6 0 .004|b .034 .003 .003 ea7 0 .06
treefrog:a red-eyed tree frog:g:hop:s .011 gn4 0 .002 0 sy.7|s .005 gn4 .008 .008 .004|s .005 gn4 .008 .008 -.004|s .0025 re5 .011 .01 .005|s .0025 re5 .011 .01 -.005|b .008 .003 .005 or4 -.006 0 .009
orchid:a rare orchid:g:grow:c .002 .034 gr6|s .008 pu3 .004 .034 0 sy.5|s .008 pk2 -.005 .028 0 sy.5|s .003 ye3 .004 .037|b .014 .002 .006 gr5 .006 .008 0 rz.5
sloth:a sloth on a branch:g:wig:b .05 .004 .004 ea7 0 .04|b .014 .02 .012 sa5 0 .018|s .008 sa4 .01 .02|b .003 .014 .003 sa5 .006 .03|b .003 .014 .003 sa5 -.006 .03|c .003 .04 ea7 -.024
chameleon:a chameleon:g:spin:b .024 .01 .008 gn4 0 .008|b .01 .009 .008 gn4 .016 .012|s .003 ye3 .018 .016 .004|c .006 .004 gn5 -.016 .01 0 rx1.57|b .004 .008 .004 gn5 .006|b .004 .008 .004 gn5 -.006
pineapple:a pineapple:g:hop:s .013 ye5 0 .004 0 sy1.3|k .006 .014 gr6 0 .03|k .004 .014 gr5 .004 .03 0 rz-.5|k .004 .014 gr5 -.004 .03 0 rz.5`,
  alpine: `
alphorn:an alphorn:g:wig:c .003 .07 sa4 0 .004 0 rz1.35|k .01 .016 sa4 .034 .006 0 rz-1.8|c .004 .004 K -.034 .02 0 rz1.35
cowbell:a large cow bell:g:wig:b .02 .022 .014 ye5 0 .004 0 t.3|b .012 .005 .008 ea7 0 .026|s .004 K 0 .003
edelweiss:an edelweiss:g:grow:c .0015 .02 gr6|s .008 W .005 .022 0 sy.3|s .008 W -.005 .022 0 sy.3|s .008 W 0 .022 .005 sy.3|s .004 ye3 0 .024
climbingrope:a coil of climbing rope:g:spin:c .016 .005 or5|c .013 .005 or4 0 .005|c .01 .005 or5 0 .01|c .004 .012 ne4 .014 .004 0 rz-.6
iceaxe:an ice axe in the snow:g:wig:b .003 .046 .003 ne5 0 0 0 rz.15|b .022 .005 .004 ne4 -.008 .044 0 rz.15|s .012 sn0 0 -.004 0 sy.5
marmot:a marmot that whistles:g:hop:b .014 .024 .012 ea5|s .009 ea5 0 .03|b .006 .003 .004 K .006 .03|b .004 .01 .004 ea6 .008 .012 0 rz-.5|b .004 .01 .004 ea6 -.008 .012 0 rz.5
cheesewheel:a wheel of cheese:g:spin:c .02 .012 ye3|b .014 .013 .01 ye4 .012 0 .006|s .003 ye5 -.006 .012 .004|s .002 ye5 .002 .012 -.008
summitflag:a summit flag:g:wig:c .002 .06 ne5|p .024 .016 .002 re5 .012 .046 0 rz-1.57|s .012 sn0 0 -.006 0 sy.5
cuckooclock:a cuckoo clock:g:hop:b .024 .026 .014 ea6 0 .006|p .03 .014 .018 ea8 0 .032|c .007 .002 W 0 .016 .0075 rx1.57|b .006 .006 .008 ye3 0 .028 .01|c .0015 .012 ea8 .006 -.006|c .0015 .012 ea8 -.006 -.006
goggles:a pair of ski goggles:g:hop:b .034 .012 .008 K 0 .004|b .013 .008 .003 or4* .008 .006 .004|b .013 .008 .003 or4* -.008 .006 .004`,
  crystal: `
geode:a geode cut in half:g:spin:s .018 ro6 0 0 0 sy.7|c .013 .003 am4* 0 .012|s .005 am2* .003 .014|s .004 am3* -.005 .014 .003|s .004 pu3* 0 .014 -.006
crystalball:a crystal ball:g:grow:c .012 .008 ne8|s .015 am2* 0 .02|s .005 W .005 .028 .008
rainbowprism:a prism with a rainbow:g:spin:p .02 .026 .02 se1|b .03 .002 .004 re5 .026 .004 0 rz.2|b .03 .002 .004 ye4 .026 .008 0 rz.1|b .03 .002 .004 bl5 .026 .012
diamondring:a diamond ring:g:spin:c .012 .004 ye4 0 .012 0 rx1.57|c .008 .005 K 0 .012 0 rx1.57|p .008 .008 .008 se1* 0 .024|k .005 .006 se1* 0 .03 0 rx3.14
glowshard:a shard that glows:g:grow:p .012 .04 .012 pu3* 0 0 0 rz.1|p .008 .022 .008 pk3* .01 0 .004 rz-.4|s .016 ne8 0 -.008 0 sy.4
minerlamp:a miner lamp:g:wig:c .011 .006 ne6|c .009 .018 ye2* 0 .006|c .011 .005 ne6 0 .024|c .008 .003 ne5 0 .036 0 rx1.57
loupe:a jeweler loupe on a gem:g:hop:p .014 .012 .014 re4* 0 0|c .012 .003 K 0 .02|c .009 .004 se1 0 .02|b .003 .003 .02 K 0 .02 .02
crystalflower:a crystal flower:g:grow:c .002 .03 se4|p .008 .016 .008 pk2* .006 .03 0 rz-.6|p .008 .016 .008 pk2* -.006 .03 0 rz.6|p .008 .016 .008 am2* 0 .03 .006 rx.6|p .006 .012 .006 ye2* 0 .034
windchime:a crystal wind chime:g:wig:c .002 .06 ne6|b .03 .003 .003 ne6 .012 .058|p .005 .02 .005 se2* .008 .034 0 rx3.14|p .005 .026 .005 am2* .016 .03 0 rx3.14|p .005 .016 .005 pk2* .024 .038 0 rx3.14
mirror:a mirror that shows the sky:g:spin:b .024 .034 .003 se2 0 .006|b .028 .038 .002 ye5 0 .004 -.002|b .016 .005 .012 ye5`,
  coral: `
clownfish:a clownfish:w:hop:b .02 .012 .007 or4 0 .004|b .004 .013 .008 W .004 .004|b .004 .013 .008 W -.006 .004|p .01 .01 .004 or4 -.014 .004 0 rz1.57|s .002 K .008 .012 .004
seaturtle:a sea turtle:w:hop:d .02 .01 ol5 0 -.002|b .01 .005 .008 gr4 .02|b .012 .003 .008 gr4 .008 0 .02 ry.5|b .012 .003 .008 gr4 .008 0 -.02 ry-.5|b .008 .003 .006 gr4 -.016 0 .012
pearloyster:an oyster with a pearl:g:grow:d .018 .008 pl3|b .03 .004 .026 pl2 0 .016 -.004 rx-.6|s .006 W* 0 .01
seahorse:a seahorse:w:wig:b .008 .02 .008 ye4 0 0|b .008 .008 .01 ye4 .003 .02|b .01 .004 .004 ye4 .01 .022|c .004 .004 ye5 .003 -.004 0 rx1.57|p .004 .01 .003 or4 -.006 .012 0 rz1.57
seaurchin:a sea urchin:g:grow:s .012 pu7|p .003 .014 .003 pu6 0 .008|p .003 .014 .003 pu6 .008 .006 0 rz-.9|p .003 .014 .003 pu6 -.008 .006 0 rz.9|p .003 .014 .003 pu6 0 .006 .008 rx.9|p .003 .014 .003 pu6 0 .006 -.008 rx-.9
snorkel:a snorkel and a mask:g:hop:b .026 .014 .01 se3 0 .004|b .03 .018 .006 K 0 .002 -.004|c .003 .034 or4 .018 .004|c .003 .01 or4 .014 .036 0 rz1.2
pufferfish:a pufferfish:w:grow:s .014 ye3 0 .004|p .003 .008 .003 or5 0 .016|p .003 .008 .003 or5 .012 .008 0 rz-1.3|p .003 .008 .003 or5 -.012 .008 0 rz1.3|s .003 K .009 .01 .009|b .005 .003 .003 or5 .014 .004
conch:a conch shell:g:spin:k .014 .03 pk2 0 .01 0 rz1.3|s .011 pk3 -.006 .012|b .016 .004 .012 co3 -.004 .004 .008
seasponge:a sea sponge:g:grow:c .009 .03 ye4|c .007 .022 or4 .014 0 .004|c .006 .016 ye5 -.012 0 -.004|c .005 .002 K 0 .03|c .004 .002 K .014 .022 .004
octopus:a small octopus:w:wig:s .013 pk4 0 .008|b .004 .004 .018 pk4 .008 0 .01 ry.5|b .004 .004 .018 pk4 -.008 0 .01 ry-.5|b .018 .004 .004 pk4 .014|b .018 .004 .004 pk4 -.014|s .003 W .005 .012 .01|s .003 W -.005 .012 .01`,
  beach: `
beachball:a beach ball:g:hop:s .016 W 0 .002|b .008 .028 .028 re5 .008 -.012|b .008 .028 .028 bl5 -.008 -.012|b .028 .028 .008 ye4 0 -.012 .008
flipflops:a pair of flip-flops:g:hop:b .01 .003 .024 A -.008|b .01 .003 .024 A .008 0 .004 ry.3|b .008 .004 .002 W -.008 .003 .006|b .008 .004 .002 W .009 .003 .01 ry.3
sunlounger:a sun lounger:g:wig:b .02 .004 .04 W 0 .01|b .02 .004 .02 W 0 .018 -.026 rx-.8|b .003 .01 .003 ea6 .008 0 .014|b .003 .01 .003 ea6 -.008 0 .014|b .003 .01 .003 ea6 .008 0 -.014|b .003 .01 .003 ea6 -.008 0 -.014
bucketspade:a bucket and a spade:g:hop:c .012 .018 re5 0 0 0 t-.2|c .013 .003 re6 0 .018|b .003 .03 .003 ye4 .02 0 0 rz-.3|b .01 .012 .003 ye4 .016 0 0 rz-.3
icecream:an ice cream cone:g:grow:k .009 .024 sa4 0 .024 0 rx3.14|s .01 pk2 0 .028|s .008 pl1 0 .04|s .003 re5 0 .05
lifering:a life ring on a post:g:spin:c .003 .05 W|c .016 .005 re5 0 .034 .004 rx1.57|c .009 .006 W 0 .034 .004 rx1.57|b .008 .006 .006 W .012 .034 .004|b .008 .006 .006 W -.012 .034 .004
volleyball:a volleyball net:g:wig:c .002 .04 ea7 .03|c .002 .04 ea7 -.03|b .06 .014 .001 W 0 .026|s .007 ye3 .012 .05
sunglasses:a pair of sunglasses:g:hop:b .014 .01 .003 K .009 .004|b .014 .01 .003 K -.009 .004|b .006 .003 .003 K 0 .01|b .003 .003 .016 K .016 .01 -.008|b .003 .003 .016 K -.016 .01 -.008
towel:a striped beach towel:g:grow:b .03 .002 .05 W|b .03 .0025 .008 A 0 0 .016|b .03 .0025 .008 A 0 0 0|b .03 .0025 .008 A 0 0 -.016|s .006 ye4 .006 .006 .018
seagull:a seagull with a chip:g:hop:b .018 .01 .01 W 0 .014|s .006 W .012 .024|p .003 .008 .003 ye4 .019 .024 0 rz-1.57|b .012 .003 .004 ne4 -.008 .02|c .001 .014 or5 .002|c .001 .014 or5 -.003 0 .003|b .004 .003 .012 ye5 .024 .022`,
  valley: `
trout:a trout that jumps:w:hop:b .026 .01 .006 ol4 0 .01 0 rz.5|p .01 .01 .004 ol5 -.016 .002 0 rz2.1|b .004 .006 .008 pk3 .004 .012 0 rz.5|s .002 K .01 .018 .003|c .016 .002 se2
shepherdcrook:a shepherd crook:g:wig:c .002 .06 ea6|c .008 .003 ea6 .008 .058 0 rx1.57|c .005 .004 gr5 .008 .058 0 rx1.57
kingfisher:a kingfisher:g:hop:c .002 .034 ea7|b .012 .014 .01 se5 0 .034|b .01 .008 .008 or4 .002 .034 .002|s .006 se6 .004 .05|p .003 .014 .003 K .014 .05 0 rz-1.57
cairn:a stack of river stones:g:wig:s .016 ro5 0 -.004 0 sy.6|s .012 ro4 .002 .008 0 sy.6|s .009 ro6 -.001 .018 0 sy.6|s .006 ro3 .001 .026 0 sy.7
woolbasket:a basket of wool:g:hop:c .016 .014 ea5|c .017 .003 ea7 0 .014|s .008 W .004 .018|s .007 pk2 -.006 .018 .003|s .006 se3 0 .02 -.006
otter:an otter on its back:w:wig:b .034 .008 .012 ea7 0 0|s .008 ea7 .02 .006|b .014 .004 .008 sa3 .004 .008|b .012 .004 .006 ea8 -.022 .002|s .004 ro4 .004 .014
millstone:an old millstone:g:spin:c .022 .01 ro4 0 .022 0 rx1.3|c .006 .012 K 0 .022 0 rx1.3|b .03 .004 .014 ea7 0 0 -.006
trailmarker:a trail marker:g:wig:c .003 .046 ea6|p .026 .012 .003 ye4 .01 .036 0 rz-1.57|b .016 .008 .003 re5 -.008 .022
walkingstick:a walking stick and a pack:g:hop:c .002 .06 ea6 .016 0 0 rz-.2|b .02 .024 .014 A -.004|b .022 .006 .016 S -.004 .024|b .008 .01 .004 ea7 -.004 .008 .008
honeypot:a pot of honey:g:grow:c .014 .02 or6|c .015 .004 ye3 0 .02|c .011 .003 or7 0 .024|b .003 .02 .003 ea6 .008 .022 0 rz-.5|s .004 ye2 .016 .004`,
  savannah: `
termitemound:a termite mound:g:grow:k .02 .05 ea5|k .012 .034 ea6 .014 0 .006|k .008 .02 ea5 -.012 0 -.006
binoculars:a pair of binoculars:g:hop:c .007 .022 K -.007 .004 0 rx1.57|c .007 .022 K .007 .004 0 rx1.57|b .008 .006 .008 ne6 0 .006|c .008 .003 se3 -.007 .004 .012 rx1.57|c .008 .003 se3 .007 .004 .012 rx1.57
meerkat:a meerkat on watch:g:hop:b .01 .03 .009 sa5|s .007 sa5 0 .034|b .005 .003 .004 K .005 .035|b .003 .012 .003 sa6 .006 .012 0 rz-.2|b .003 .012 .003 sa6 -.006 .012 0 rz.2|c .002 .02 sa6 -.008 0 0 rz1.2
ostrichegg:an ostrich egg in a nest:g:grow:c .02 .006 sa6|s .012 pl1 0 .012 0 sy1.3|b .006 .008 .002 K .004 .018 .011
warthog:a warthog:g:hop:b .026 .014 .012 ro6 0 .008|b .012 .012 .011 ro6 .018 .01|k .002 .008 pl1 .024 .008 .005 rz-.6|k .002 .008 pl1 .024 .008 -.005 rz-.6|c .001 .014 ro7 -.014 .02|b .004 .008 .004 ro7 .008|b .004 .008 .004 ro7 -.008
cameratripod:a camera on a tripod:g:spin:c .0015 .04 K .01 0 0 rz.25|c .0015 .04 K -.01 0 0 rz-.25|c .0015 .04 K 0 0 .01 rx-.25|b .02 .014 .012 ne7 0 .04|c .006 .01 K 0 .047 .008 rx1.57|c .005 .002 se2 0 .047 .014 rx1.57
hornbill:a hornbill:g:wig:c .002 .03 ea7|b .012 .018 .01 K 0 .03|s .006 K .002 .052|b .018 .006 .005 ye4 .012 .052|b .012 .004 .005 re5 .008 .058|b .006 .016 .004 W -.006 .026 0 rz.3
gourd:a painted gourd:g:wig:s .014 or5 0 .002|s .008 or5 0 .02|c .002 .008 ea7 0 .028|b .0145 .003 .0145 A 0 .008|b .003 .003 .003 W .01 .014 .008
dungbeetle:a dung beetle with its ball:g:hop:s .014 ea8 .012 .002|b .012 .006 .009 K -.008 .003|b .005 .004 .005 K -.016 .003|b .006 .002 .002 K -.004 .008 .005 rz.6|b .006 .002 .002 K -.004 .008 -.005 rz.6
weavernest:a weaver bird nest:g:wig:c .002 .05 ea7|b .03 .003 .003 ea7 .012 .048|s .012 sa5 .022 .03 0 sy1.2|c .005 .003 K .022 .022 .009 rx1.57|b .008 .006 .006 ye3 .022 .046`,
  urban: `
hydrant:a fire hydrant:g:wig:c .008 .024 re5|d .008 .006 re5 0 .024|c .004 .008 re6 .01 .014 0 rz1.57|c .004 .008 re6 -.01 .014 0 rz1.57|c .011 .003 re6
trafficcone:a traffic cone:g:hop:b .022 .003 .022 or5|k .009 .03 or5 0 .003|c .0072 .005 W 0 .012|c .005 .004 W 0 .021
pigeon:a pigeon:g:hop:b .016 .01 .009 ne4 0 .01 0 rz.2|s .005 ne5 .01 .02|p .002 .005 .002 ye4 .015 .02 0 rz-1.57|b .01 .003 .006 ne5 -.01 .012|c .001 .01 pk4 .002|c .001 .01 pk4 -.002 0 .003
newsstand:a newspaper stand:g:hop:b .02 .03 .014 bl5|b .016 .014 .002 se1 0 .012 .007|b .018 .004 .012 W 0 .03|b .012 .008 .002 W 0 .004 .0075
parkingmeter:a parking meter:g:wig:c .002 .04 ne6|b .01 .014 .008 ne5 0 .04|b .006 .005 .002 ye2* 0 .046 .004|c .005 .004 ne5 0 .054 0 rx1.57
skateboard:a skateboard:g:spin:b .04 .003 .012 A 0 .006|b .008 .003 .012 A .022 .008 0 rz.5|b .008 .003 .012 A -.022 .008 0 rz-.5|c .003 .012 W .012 0 0 rx1.57|c .003 .012 W -.012 0 0 rx1.57
raccoonbin:a raccoon in a trash can:g:hop:c .013 .026 ne5|c .014 .003 ne6 0 .026|s .008 ne4 0 .034|b .014 .004 .004 K 0 .035 .006|p .004 .005 .003 ne5 .005 .042|p .004 .005 .003 ne5 -.005 .042|c .015 .003 ne6 .02 .002 0 rz.3
hotdogcart:a hot dog cart:g:hop:b .032 .016 .018 W 0 .008|b .034 .003 .02 re5 0 .024|c .0015 .024 ne5 -.012 .024|k .02 .008 ye4 -.012 .046|c .006 .004 K .01 0 .01 rx1.57|c .006 .004 K -.01 0 .01 rx1.57
manhole:a manhole with steam:g:grow:c .018 .003 ne7|c .014 .0035 ne6|s .007 W 0 .012|s .009 W .003 .028|s .006 pl1 -.002 .044
phonebooth:a phone booth:g:wig:b .02 .046 .02 re5|b .022 .004 .022 re6 0 .046|b .014 .026 .001 se1 0 .014 .0101|b .014 .026 .001 se1 .0101 .014 0 ry1.57|b .01 .004 .001 W 0 .041 .0101`,
  suburban: `
lawnmower:a lawn mower:g:hop:b .024 .01 .02 re5 0 .004|b .012 .008 .012 K 0 .014|b .002 .03 .002 ne5 -.014 .008 .008 rz.5|b .002 .03 .002 ne5 -.014 .008 -.008 rz.5|b .002 .002 .02 ne5 -.028 .034|c .005 .003 K .008 0 .011 rx1.57|c .005 .003 K .008 0 -.011 rx1.57
gardenhose:a garden hose:g:spin:c .016 .005 gn5|c .012 .005 gn4 0 .005|c .008 .005 gn5 0 .01|c .003 .016 ye4 .016 .004 0 rz-1.3
flamingo:a plastic flamingo:g:wig:c .001 .03 pk4|s .01 pk3 0 .034 0 sx1.3|c .003 .02 pk3 .008 .038 0 rz-.2|b .006 .005 .005 pk3 .012 .058|p .003 .006 .003 K .018 .058 0 rz-1.57
barbecue:a barbecue that smokes:g:grow:c .001 .022 K .008 0 .006|c .001 .022 K -.008 0 .006|c .001 .022 K 0 0 -.008|d .016 .01 K 0 .022 0 rx3.14|c .016 .003 re5 0 .024|s .006 pl1 .002 .04|s .008 pl1 -.002 .056
paddlingpool:a paddling pool:g:grow:c .026 .008 bl4|c .022 .002 se2 0 .008|s .005 ye3 .008 .012|c .008 .003 re4 -.008 .01 .004
swing:a garden swing:g:wig:b .003 .05 .003 ea6 .022 0 0 rz.12|b .003 .05 .003 ea6 -.022 0 0 rz-.12|b .05 .003 .003 ea6 0 .048|c .0008 .03 K .008 .016|c .0008 .03 K -.008 .016|b .022 .003 .008 A 0 .014
basketballhoop:a basketball hoop:g:hop:c .002 .06 ne5|b .024 .018 .002 W .004 .05|c .008 .002 or5 .004 .05 .01|s .007 or5 .016 .004 .014
sprinkler:a lawn sprinkler:g:spin:b .012 .004 .012 ne5|c .002 .008 ne5 0 .004|b .03 .002 .002 ne4 0 .012|s .003 se2 .018 .018|s .003 se2 -.018 .018|s .0025 se2 .026 .01|s .0025 se2 -.026 .01
welcomemat:a welcome mat with a key:g:hop:b .036 .002 .022 ea5|b .03 .0025 .004 ea8 0 0 .004|b .01 .003 .003 ye4 .008 .002 -.004|c .004 .003 ye4 .016 .002 -.004
recyclingbin:a recycling bin:g:hop:b .02 .026 .018 bl5|b .022 .003 .02 bl6 0 .026 0 rz.15|b .008 .008 .001 W 0 .01 .0091|b .006 .012 .006 se1 .004 .026 0 rz.4`,
  ocean: `
dolphin:a dolphin that jumps:w:hop:b .034 .012 .01 se6 0 .012 0 rz.5|b .012 .008 .008 se6 .02 .026 0 rz-.2|p .006 .01 .004 se7 0 .024 0 rz.5|p .012 .01 .004 se7 -.02 0 0 rz2.3|c .016 .002 W
floatingcrate:a crate that floats:w:wig:b .028 .024 .028 ea5 0 -.008 0 rz.12|b .03 .004 .03 ea7 0 .012 0 rz.12|b .004 .024 .03 ea7 .01 -.008 0 rz.12|b .01 .002 .008 W -.004 .017 0 rz.12
sharkfin:a shark fin:w:spin:p .008 .03 .022 ne6 0 0 0|b .01 .002 .03 W 0 0 -.02|b .006 .002 .016 W .004 0 -.04
flyingfish:a flying fish:a:hop:b .024 .007 .005 se4|p .008 .008 .003 se5 -.014 0 0 rz1.57|b .004 .001 .018 se1 .002 .004 .008 rx-.4|b .004 .001 .018 se1 .002 .004 -.008 rx.4
mantaray:a manta ray:w:wig:b .03 .003 .05 db6 0 -.004|b .018 .004 .02 db7 0 -.003|c .0015 .04 db7 -.03 -.004 0 rz1.57|b .004 .003 .006 W .014 -.002 .006|b .004 .003 .006 W .014 -.002 -.006
netfloats:a net with glass floats:w:wig:s .008 gn3 .012 0 0|s .008 se3 -.008 0 .01|s .007 gn4 -.004 0 -.012|b .04 .001 .03 ea6 0 -.004
albatross:an albatross:a:wig:b .016 .008 .008 W|b .006 .002 .034 W 0 .004 .018 rx-.2|b .006 .002 .034 W 0 .004 -.018 rx.2|p .003 .008 .003 ye4 .012 0 0 rz-1.57|b .006 .002 .012 K 0 .005 .034 rx-.2|b .006 .002 .012 K 0 .005 -.034 rx.2
paperboat:a paper boat:w:hop:b .034 .008 .014 W 0 0 0 t.3|p .014 .018 .004 W 0 .008|b .036 .002 .016 se1 0 -.002
jellyfish:a jellyfish that glows:w:grow:d .014 .012 pk2* 0 -.002|c .001 .02 pk3* .006 -.022|c .001 .024 pk3* -.006 -.026|c .001 .018 pk3* 0 -.02 .006|c .001 .022 pk3* 0 -.024 -.006
barrel:a barrel with a flag:w:wig:c .014 .03 ea6 0 -.012 0 rz.2|c .0145 .003 ne6 0 -.004 0 rz.2|c .0145 .003 ne6 0 .01 0 rz.2|c .001 .03 ea7 .004 .018|b .014 .01 .001 A .012 .04`,
  sky: `
cloudsheep:a sheep made of cloud:g:hop:s .014 W 0 .012 0 sx1.3|s .01 W -.01 .016|s .009 W .008 .018|b .008 .008 .008 ne8 .018 .014|c .0015 .012 ne8 .006|c .0015 .012 ne8 -.006
star:a star that fell:a:spin:p .012 .016 .006 ye2*|p .012 .016 .006 ye2* 0 0 0 rz3.14|p .012 .016 .006 ye2* 0 0 0 rz1.57|p .012 .016 .006 ye2* 0 0 0 rz-1.57|s .007 ye1*
windsock:a wind sock:g:wig:c .002 .06 ne5|k .01 .034 or5 .02 .054 0 rz-1.57|c .0102 .006 W .008 .054 0 rz1.57
lightningjar:a jar of lightning:g:grow:c .012 .026 se1|c .013 .004 ne6 0 .026|b .004 .01 .003 ye2* .002 .014 0 rz.5|b .004 .01 .003 ye2* -.002 .006 0 rz-.5
weatherballoon:a weather balloon:a:grow:s .018 W 0 .02|c .0008 .03 K 0 -.012|b .01 .008 .008 or5 0 -.02|c .0015 .006 ne5 0 -.026
harp:a golden harp:g:wig:b .004 .05 .004 ye4 -.012|b .028 .004 .004 ye4 0 .046 0 rz-.3|b .004 .03 .004 ye4 .012 .012 0 rz.5|c .0006 .036 W -.004 .006|c .0006 .03 W .002 .01|c .0006 .022 W .008 .016
ladder:a ladder that goes up:g:grow:b .003 .07 .003 ea6 .008|b .003 .07 .003 ea6 -.008|b .018 .003 .003 ea6 0 .012|b .018 .003 .003 ea6 0 .028|b .018 .003 .003 ea6 0 .044|b .018 .003 .003 ea6 0 .06
wings:a pair of wings:g:wig:b .004 .02 .004 W|b .026 .016 .003 W .016 .012 0 rz.4|b .026 .016 .003 W -.016 .012 0 rz-.4|b .016 .012 .003 pl1 .024 .002 0 rz.9|b .016 .012 .003 pl1 -.024 .002 0 rz-.9
messengerbird:a bird with a letter:a:wig:b .014 .008 .008 bl4|b .004 .002 .022 bl5 0 .004 .012 rx-.3|b .004 .002 .022 bl5 0 .004 -.012 rx.3|p .003 .006 .003 ye4 .01 0 0 rz-1.57|b .008 .006 .001 W .004 -.006
raincloud:a small rain cloud:a:grow:s .014 ne3 0 0 0 sx1.4 sy.7|s .01 ne2 .012 .004|s .009 ne3 -.012 .002|c .0008 .012 se4 .004 -.016|c .0008 .012 se4 -.006 -.018|c .0008 .012 se4 .012 -.02`,
};

// ---- From the lines above to things that details.js can draw.
function color(code, c) {
  if (code === 'A') return c.a(0.6); if (code === 'S') return c.s(0.5); if (code === 'W') return c.W; if (code === 'K') return c.K;
  const m = /^([a-z]{2})([\d.]+)(\*?)$/.exec(code) || /^(W)()(\*)$/.exec(code);
  if (!m) return c.K;
  if (m[1] === 'W') return [ROW.plaster, 0.2, 6];
  return [ROW[ROWS[m[1]]], +m[2], m[3] ? 6 : 0];
}
const SIZE = { b: 3, c: 2, s: 1, k: 2, p: 3, d: 2 };
function parse(text, biome) {
  const out = [];
  for (const line of text.trim().split('\n')) {
    const [id, label, where, move, shapes] = line.split(':');
    const parts = shapes.split('|').map((s) => {
      const tk = s.trim().split(/\s+/), kind = tk[0], n = SIZE[kind], size = tk.slice(1, 1 + n).map(Number), col = tk[1 + n], pos = [], o = {};
      for (const q of tk.slice(2 + n)) { const m = /^([a-z]+)(-?[\d.]+)$/.exec(q); if (m) o[m[1]] = +m[2]; else pos.push(+q); }
      return { kind, size, col, o: { x: pos[0] || 0, y: pos[1] || 0, z: pos[2] || 0, ...o } };
    });
    out.push({ id, label, where, move, parts, biome });
  }
  return out;
}
export function drawParts(db, item, c, p) {
  const j = Math.sin(p * Math.PI), m = item.move;
  db.push(0, m === 'hop' ? j * 0.06 : 0, 0, m === 'spin' ? p * Math.PI * 2 : 0, m === 'grow' ? 1 + j * 0.5 : 1, 0, m === 'wig' ? Math.sin(p * Math.PI * 4) * 0.35 : 0);
  for (const q of item.parts) {
    const col = color(q.col, c), s = q.size;
    if (q.kind === 'b') db.box(s[0], s[1], s[2], col, q.o);
    else if (q.kind === 'c') db.cyl(s[0], s[1], col, q.o);
    else if (q.kind === 's') db.ball(s[0], col, q.o);
    else if (q.kind === 'k') db.cone(s[0], s[1], col, q.o);
    else if (q.kind === 'p') db.pyr(s[0], s[1], s[2], col, q.o);
    else if (q.kind === 'd') db.dome(s[0], s[1], col, q.o);
  }
  db.pop();
}
export const LIB_UNIVERSAL = parse(UNIVERSAL, null);
export const LIB_BIOME = Object.fromEntries(Object.entries(BY_BIOME).map(([k, v]) => [k, parse(v, k)]));

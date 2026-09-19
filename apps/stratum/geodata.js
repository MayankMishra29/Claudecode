/* Stratum - datasets for the 3D scenes.
   Coastlines and plate boundaries are deliberately generalised outlines
   authored for this app, good to roughly a degree. They are for teaching
   shape and relationship, not for measurement. Earthquakes are real
   events with published epicentres and magnitudes. */

export const COASTS = [
  // Africa
  [[37,-6],[33,11],[31,25],[31,32],[22,37],[12,43],[10,51],[2,46],[-5,39],[-10,40],
   [-18,36],[-26,33],[-34,26],[-34,18],[-23,14],[-6,12],[0,9],[4,9],[6,3],[5,-4],
   [8,-13],[15,-17],[21,-17],[28,-13],[33,-9],[37,-6]],
  // Eurasia
  [[36,-6],[43,-9],[48,-5],[52,4],[58,10],[60,22],[65,25],[70,31],[73,55],[76,100],
   [73,140],[70,170],[66,-170],[60,163],[54,142],[45,135],[39,127],[31,122],[22,114],
   [21,107],[10,105],[14,99],[16,94],[22,89],[16,81],[8,77],[19,73],[23,68],[25,57],
   [29,48],[13,45],[22,39],[30,33],[36,36],[36,30],[40,26],[38,15],[43,5],[36,-6]],
  // North America
  [[70,-160],[60,-165],[58,-152],[55,-133],[48,-125],[37,-122],[32,-117],[23,-110],
   [20,-105],[16,-95],[18,-88],[21,-87],[30,-89],[27,-80],[35,-76],[40,-74],[45,-67],
   [47,-53],[52,-56],[58,-63],[63,-78],[68,-85],[70,-125],[70,-160]],
  // South America
  [[11,-72],[10,-61],[5,-52],[0,-50],[-5,-36],[-13,-38],[-23,-43],[-33,-53],[-38,-58],
   [-43,-65],[-50,-69],[-55,-68],[-53,-75],[-45,-74],[-37,-73],[-23,-70],[-14,-76],
   [-5,-81],[0,-80],[8,-77],[11,-72]],
  // Australia
  [[-11,131],[-12,137],[-17,141],[-10,142],[-20,149],[-28,153],[-38,145],[-35,138],
   [-32,126],[-34,115],[-22,114],[-18,122],[-14,127],[-11,131]],
  // Antarctica (generalised coast)
  [[-70,-180],[-73,-150],[-75,-120],[-73,-90],[-70,-60],[-72,-30],[-70,0],[-69,30],
   [-67,60],[-66,90],[-67,120],[-70,150],[-70,180]],
  // Greenland
  [[83,-33],[78,-20],[70,-22],[65,-40],[60,-44],[67,-53],[76,-60],[81,-60],[83,-33]],
  // Madagascar
  [[-12,49],[-16,50],[-25,47],[-25,44],[-16,44],[-12,49]],
  // Japan
  [[45,142],[43,145],[39,142],[35,140],[34,136],[33,130],[31,130],[34,132],[37,137],[41,140],[45,142]],
  // Great Britain + Ireland
  [[58,-3],[54,0],[51,1],[50,-5],[54,-5],[58,-3]],
  [[55,-6],[52,-6],[52,-10],[55,-8],[55,-6]],
  // New Zealand
  [[-34,173],[-37,175],[-41,175],[-46,167],[-44,170],[-41,172],[-37,174],[-34,173]],
  // Sumatra, Java, Borneo
  [[6,95],[-6,105],[-5,102],[3,97],[6,95]],
  [[-6,105],[-8,114],[-9,113],[-7,106],[-6,105]],
  [[7,117],[-4,114],[-3,110],[2,109],[7,117]],
  // Sri Lanka
  [[10,80],[6,80],[6,82],[9,82],[10,80]],
];

/* Plate boundaries. kind: divergent | convergent | transform */
export const PLATES = [
  { name:'Mid-Atlantic Ridge', kind:'divergent',
    pts:[[87,-5],[80,-3],[71,-8],[65,-18],[52,-30],[40,-30],[25,-45],[10,-40],[0,-14],
         [-15,-13],[-30,-14],[-45,-12],[-55,-5],[-58,10]] },
  { name:'East Pacific Rise', kind:'divergent',
    pts:[[23,-108],[15,-105],[5,-103],[-5,-102],[-20,-113],[-35,-111],[-50,-118],[-55,-130]] },
  { name:'Aleutian to Mariana trench', kind:'convergent',
    pts:[[52,-170],[52,175],[51,160],[45,150],[38,143],[30,142],[20,147],[12,145]] },
  { name:'Andean margin', kind:'convergent',
    pts:[[8,-78],[0,-81],[-5,-81],[-12,-78],[-20,-71],[-28,-72],[-35,-73],[-45,-76],[-52,-76]] },
  { name:'Middle America trench', kind:'convergent',
    pts:[[20,-106],[17,-100],[14,-93],[11,-87],[8,-83]] },
  { name:'Himalayan collision', kind:'convergent',
    pts:[[35,71],[33,76],[30,80],[28,84],[27,88],[26,92],[25,95]] },
  { name:'Alpine to Zagros belt', kind:'convergent',
    pts:[[36,-6],[38,4],[38,12],[40,18],[38,24],[38,32],[37,40],[33,48],[28,57]] },
  { name:'San Andreas fault', kind:'transform',
    pts:[[40,-124],[37,-122],[35,-120],[33,-117],[32,-115]] },
  { name:'East African Rift', kind:'divergent',
    pts:[[15,40],[11,41],[8,38],[3,37],[0,36],[-4,35],[-8,34],[-12,34],[-16,35]] },
  { name:'Sunda trench', kind:'convergent',
    pts:[[14,93],[9,93],[3,95],[-4,101],[-8,108],[-10,118],[-9,125],[-8,130]] },
  { name:'Tonga to Kermadec trench', kind:'convergent',
    pts:[[-15,-173],[-20,-174],[-25,-175],[-30,-177],[-35,179],[-42,176]] },
  { name:'Southeast Indian Ridge', kind:'divergent',
    pts:[[-28,60],[-35,70],[-43,85],[-48,105],[-50,125],[-55,145],[-60,160]] },
  { name:'Puerto Rico trench', kind:'transform',
    pts:[[19,-66],[19,-62],[17,-61],[13,-60]] },
  { name:'Cascadia subduction zone', kind:'convergent',
    pts:[[50,-128],[47,-126],[44,-125],[41,-125],[40,-124]] },
];

export const PLATE_KINDS = {
  divergent:  { label:'Divergent · plates separating', col:[0.31,0.72,0.57],
    note:'New lithosphere is created here. Shallow earthquakes, basaltic volcanism, and a central rift valley on slow-spreading ridges.' },
  convergent: { label:'Convergent · plates colliding', col:[0.88,0.45,0.35],
    note:'Lithosphere is consumed or thickened. Deep trenches, arc volcanoes, and the deepest earthquakes on Earth, down to about 700 km.' },
  transform:  { label:'Transform · plates sliding past', col:[0.95,0.77,0.30],
    note:'Lithosphere is conserved. Shallow but often destructive earthquakes, and little to no volcanism.' },
};

/* Real events: published epicentre and moment magnitude. */
export const QUAKES = [
  { name:'Valdivia, Chile',      year:1960, mag:9.5, lat:-38.14, lon:-73.41 },
  { name:'Prince William Sound', year:1964, mag:9.2, lat:60.91,  lon:-147.34 },
  { name:'Sumatra-Andaman',      year:2004, mag:9.1, lat:3.32,   lon:95.85 },
  { name:'Tohoku, Japan',        year:2011, mag:9.1, lat:38.30,  lon:142.37 },
  { name:'Kamchatka',            year:1952, mag:9.0, lat:52.62,  lon:159.78 },
  { name:'Maule, Chile',         year:2010, mag:8.8, lat:-36.12, lon:-72.90 },
  { name:'Michoacan, Mexico',    year:1985, mag:8.0, lat:18.19,  lon:-102.53 },
  { name:'San Francisco',        year:1906, mag:7.9, lat:37.75,  lon:-122.55 },
  { name:'Gorkha, Nepal',        year:2015, mag:7.8, lat:28.23,  lon:84.73 },
  { name:'Kahramanmaras, Turkiye',year:2023, mag:7.8, lat:37.17, lon:37.03 },
  { name:'Bhuj, Gujarat',        year:2001, mag:7.7, lat:23.42,  lon:70.23 },
  { name:'Tangshan, China',      year:1976, mag:7.6, lat:39.63,  lon:118.10 },
  { name:'Muzaffarabad, Kashmir',year:2005, mag:7.6, lat:34.54,  lon:73.59 },
  { name:'Christchurch, NZ',     year:2011, mag:6.3, lat:-43.58, lon:172.68 },
];

/* A composite peninsular-India section, oldest at the base. */
export const CORE_LAYERS = [
  { name:'Archaean basement',   unit:'Peninsular Gneiss',       age:'> 2500 Ma', thick:1.15,
    col:[0.42,0.40,0.45], rock:'Metamorphic',
    note:'Banded tonalitic gneiss, the oldest crust on the subcontinent. Intensely deformed, with fold interference patterns visible at outcrop scale.' },
  { name:'Greenstone belt',     unit:'Dharwar Supergroup',      age:'2900-2600 Ma', thick:0.55,
    col:[0.20,0.38,0.31], rock:'Volcano-sedimentary',
    note:'Metavolcanics with banded iron formation. Hosts the Kolar and Hutti gold belts, and most of India’s iron ore.' },
  { name:'Proterozoic basin',   unit:'Vindhyan Supergroup',     age:'1700-650 Ma', thick:0.95,
    col:[0.72,0.55,0.36], rock:'Sedimentary',
    note:'Flat-lying sandstone, shale and limestone, barely deformed. The red sandstone of Fatehpur Sikri and much of Mughal Delhi was quarried from it.' },
  { name:'Coal measures',       unit:'Gondwana Supergroup',     age:'300-250 Ma', thick:0.72,
    col:[0.16,0.16,0.18], rock:'Sedimentary',
    note:'Rift-basin fluvial sandstone and shale with thick coal seams. The Barakar Formation holds roughly 99 percent of Indian coal reserves.' },
  { name:'Flood basalt',        unit:'Deccan Traps',            age:'~66 Ma', thick:0.85,
    col:[0.26,0.29,0.33], rock:'Igneous',
    note:'Stacked pahoehoe and aa flows across some 500,000 km2, erupted across the Cretaceous-Paleogene boundary. The step topography gives the province its name.' },
  { name:'Laterite',            unit:'Weathering profile',      age:'Neogene', thick:0.30,
    col:[0.66,0.33,0.20], rock:'Residual',
    note:'Iron and aluminium rich residual soil formed by intense tropical leaching of the basalt beneath. The parent of bauxite ore.' },
  { name:'Alluvium',            unit:'Quaternary cover',        age:'< 2.6 Ma', thick:0.26,
    col:[0.80,0.72,0.55], rock:'Unconsolidated',
    note:'River sand, silt and gravel. In the Indo-Gangetic basin this cover reaches several hundred metres and hosts the aquifers most of north India drinks from.' },
];

/* Seven crystal systems. form drives the geometry builder. */
export const CRYSTALS = [
  { sys:'Cubic',        form:'box', a:1,   b:1,   c:1,   shear:0,   mineral:'Halite, pyrite, galena, diamond',
    note:'Three axes of equal length, all at right angles. The most symmetric system: four three-fold axes along the body diagonals.' },
  { sys:'Tetragonal',   form:'box', a:1,   b:1,   c:1.6, shear:0,   mineral:'Zircon, rutile, cassiterite',
    note:'Two equal horizontal axes and a longer vertical one, all at right angles. One four-fold axis.' },
  { sys:'Orthorhombic', form:'box', a:0.8, b:1.15,c:1.5, shear:0,   mineral:'Olivine, barite, topaz',
    note:'Three unequal axes, all still at right angles. Three mutually perpendicular two-fold axes.' },
  { sys:'Hexagonal',    form:'hex', a:1,   b:1,   c:1.7, shear:0,   mineral:'Beryl, apatite, graphite',
    note:'Three equal horizontal axes at 120 degrees plus a vertical axis. One six-fold axis.' },
  { sys:'Trigonal',     form:'rhomb', a:1, b:1,   c:1.5, shear:0,   mineral:'Quartz, calcite, corundum, tourmaline',
    note:'A rhombohedral lattice with a single three-fold axis. Calcite cleaves into rhombs that make this obvious in the hand specimen.' },
  { sys:'Monoclinic',   form:'box', a:1,   b:1.2, c:1.4, shear:0.32,mineral:'Gypsum, orthoclase, mica, augite',
    note:'Three unequal axes, one pair oblique. The commonest system among rock-forming minerals.' },
  { sys:'Triclinic',    form:'box', a:0.9, b:1.1, c:1.35,shear:0.5, mineral:'Plagioclase, kyanite, microcline',
    note:'Three unequal axes, none at right angles. The least symmetric system: only a centre of symmetry, at most.' },
];

/* Terrain lab: named raster products the same DEM can be rendered as. */
export const TERRAIN_LAYERS = [
  { id:'hillshade', label:'Hillshade',  note:'Simulated illumination from the northwest at 45 degrees. The cartographic default, because human vision reads lit relief as shape.' },
  { id:'elevation', label:'Elevation',  note:'A sequential ramp over height. One hue, light to dark, so the reader can order values without a legend lookup.' },
  { id:'slope',     label:'Slope',      note:'The first derivative of the surface. Steep ground reads hot. This is the layer that drives landslide and buildability models.' },
  { id:'aspect',    label:'Aspect',     note:'Downslope compass direction. Cyclic data, so it needs a cyclic ramp: any sequential ramp would put a false seam at north.' },
  { id:'contour',   label:'Contours',   note:'Lines of constant elevation at a fixed interval. Exact where a colour ramp is approximate, which is why survey sheets still use them.' },
];

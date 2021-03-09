// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ----------------------------------------------------------------------------
// TrueColor SHRGB Version 0.1.5 - Released 02.07.21
// ----------------------------------------------------------------------------
//
//
// THIS SOFTWARE IS PROVIDED BY Alex Woronow THROUGH PLIEADES ASTROPHOTO
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
// EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
// INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
// DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
// ----------------------------------------------------------------------------
/*
 * HOW TO USE THIS SCRIPT !!!IMPORTANT!!! Please read
 *
 * The computations done in this script depend upon the relative intensities of
 * narrowband signal to broadband signals as they are received and recorded in
 * their respective images. Because of this dependency, the input images must be,
 * in a real sense, "pure." Meaning that after the subs have be stacked/integrated,
 * further manipulations (with the possible exception of Mure Denoising) should
 * not be applied before applying this script/algorithm.
 *
 * The default settings reflect the author's best attempt to capture the natural
 * ratios of the broadband-to-narrowband intensities, which dictate the
 * broadband-to-narrowband augmenteding factors appropriate for nebulae. For instance,
 * H-alpah/H-beta ~2.92 and OIII is virtually equal parts blue and gree.
 * Unfortunately, the other line intensites are not so well fixed. However,
 * the defaults usually produce reasonable results, and keeping the ratios nearly
 * equal allows read color calibration by PhotometricColorCalibration.
*/
/*
 *  BUG REPORTING
 * Please send information on bugs to Alex@FaintLightPhotography.com. Include
 * the version number of the script you are reporting as well as relevant
 * parts of the Process Console output and other outputs/messages.
*/


// User Interface access


#feature-id    Utilities > TrueColor SHORGB

#feature-info  Ha is augmenteded into R and B according to Ha signature already in R.

#include <pjsr/ColorSpace.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/FontFamily.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/Color.jsh>

#define VERSION "0.1.5"


var ProcessingOption = 2;
var DeleteIntermediate = true;
var makeHImage = true;
var makeSImage = true;
var makeOImage = true;
var HaveH = false;
var HaveS = false;
var HaveO = false;
var HaveR = false;
var HaveG = false;
var HaveB = false;

// define a global variable containing script's parameters
var trueColorData = {

   // SOME FILTER INFORMATION
   // DSW TAO 150 Chile: Chroma filters: 8nm / 100nm
   // Astronomik 2C: 80nm / 5 or 3 nm
   // Astronomik "Deep Sky" RGB filters: 100nm
   // ZWO filters: 80nm / 7nm
   // Heven's Mirror: Astrodon Gen II 3nm / vary: see...
   //   https://astrodon.com/products/astrodon-lrgb-gen2-e-series-tru-balance-filters/

   filterWidthBB: 100.0,
   filterWidthNB: 8.0,
   exposureBB: 900,
   exposureNB: 1800,
   HFactor: 2.0,
   SFactor: 2.0,
   OFactor: 2.0,
   HbPcnt: 34.0,  // supposedly the commonly assumed value Ha/Hb=3.92
   OBPcnt: 50.0,   // very close to the true value
   HView: undefined,
   SView: undefined,
   OView: undefined,
   RView: undefined,
   GView: undefined,
   BView: undefined,
   GO_amp: "",
   BHO_amp: "",
   RHS_amp: "",
   SHO_RGB: "",
   Ha_LINE: "",
   SII_LINE: "",
   OIII_LINE: "",
   Iterate: false,

   // save parameters for new instance
   save: function () {

         Parameters.set( "exposureNB", trueColorData.exposureNB );
         Parameters.set( "exposureBB", trueColorData.exposureBB );
         Parameters.set( "filterWidthNB", trueColorData.filterWidthNB );
         Parameters.set( "filterWidthBB", trueColorData.filterWidthBB );
         Parameters.set( "HFactor", trueColorData.HFactor );
         Parameters.set( "SFactor", trueColorData.SFactor );
         Parameters.set( "OFactor", trueColorData.OFactor );
         Parameters.set( "HbPcnt", trueColorData.HbPcnt );
         Parameters.set( "OBPcnt", trueColorData.OBPcnt );
         Parameters.set( "DeleteIntermediate", DeleteIntermediate );
         Parameters.set( "HView", trueColorData.HView.id );
         Parameters.set( "SView", trueColorData.SView.id );
         Parameters.set( "OView", trueColorData.OView.id );
         Parameters.set( "RView", trueColorData.RView.id );
         Parameters.set( "GView", trueColorData.GView.id );
         Parameters.set( "BView", trueColorData.BView.id );
   },

   // load the script instance parameters
   load: function() {

      if (Parameters.has("exposureNB")) {
         trueColorData.exposureNB = Parameters.getReal("exposureNB"); }
      if (Parameters.has("exposureBB")) {
         trueColorData.exposureBB = Parameters.getReal("exposureBB"); }
      if (Parameters.has("filterWidthNB")) {
         trueColorData.filterWidthNB = Parameters.getReal("filterWidthNB"); }
      if (Parameters.has("filterWidthBB")) {
         trueColorData.filterWidthBB = Parameters.getReal("filterWidthBB"); }
      if (Parameters.has("HFactor")) {
         trueColorData.HFactor = Parameters.getReal("HFactor"); }
      if (Parameters.has("SFactor")) {
         trueColorData.SFactor = Parameters.getReal("SFactor"); }
      if (Parameters.has("OFactor")) {
         trueColorData.OFactor = Parameters.getReal("OFactor"); }
      if (Parameters.has("HbFactor")) {
         trueColorData.HbPcnt = Parameters.getReal("HbPcnt") }
      if (Parameters.has("OBPcnt")) {
         trueColorData.OBPcnt = Parameters.getReal("OBPcnt") }
      if (Parameters.has("DeleteIntermediate")) {
         DeleteIntermediate = Parameters.getBoolean("DeleteIntermediate") }
      if (Parameters.has("HView")) {
         trueColorData.HView = View.viewById(Parameters.getString("HView")); }
      if (Parameters.has("SView")) {
         trueColorData.SView = View.viewById(Parameters.getString("SView")); }
      if (Parameters.has("OView")) {
         trueColorData.OView = View.viewById(Parameters.getString("OView")); }
      if (Parameters.has("RView")) {
         trueColorData.RView = View.viewById(Parameters.getString("RView")); }
      if (Parameters.has("GView")) {
         trueColorData.GView = View.viewById(Parameters.getString("GView")); }
      if (Parameters.has("BView")) {
         trueColorData.BView = View.viewById(Parameters.getString("BView")); }
   }
};

//------------------------------------------------------------------------------
// Construct the script dialog interface
//------------------------------------------------------------------------------
function parametersDialogPrototype() {

   this.__base__ = Dialog;
   this.__base__();

   this.windowTitle = "TrueColo0-Plus SHORGB (v"+VERSION+")";

   // create a title area
   this.title = new TextBox(this);
   this.title.text = "<b>Augmented RGB</b><br><br>This script augments" +
                     " the narrowband line contributions from HII, OIII, and SII" +
                     " in the R, G, B images using a simple model that allows" +
                     " separating the broadband background color from the " +
                     " narrowband line contribution and augments the line " +
                     " without also enhancing the background component. " +
                     " This is most likely what most of us want, but do not " +
                     " obtain from other algorithms." +
                     " <p>       --Alex Woronow - (v"+VERSION+") -- 2021--";
   this.title.readOnly = true;
   this.title.backroundColor = 0x333333ff;
   this.title.minHeight = 130;
   this.title.maxHeight = 130;

   // BroadBand Image Pickers
   //
   // add R View picker
   this.RViewList = new ViewList(this);
   this.RViewList.width = 25;
   this.RViewList.getMainViews();
   if (trueColorData.RView) {
      this.RViewList.currentView = trueColorData.RView;
   }
   trueColorData.RView = this.RViewList.currentView;
   this.RViewList.toolTip = "<p>Select a linear HII-filter image to augment the " +
                              "intensification of the RGB image's R and B Channels.</p>";
   this.RViewList.onViewSelected = function (View) {
      trueColorData.RView = View;
   }

   // add G View picker
   this.GViewList = new ViewList(this);
   this.GViewList.width = 25;
   this.GViewList.getMainViews();
   if (trueColorData.GView) {
      this.GViewList.currentView = trueColorData.GView;
   };
   trueColorData.GView = this.GViewList.currentView;
   this.GViewList.toolTip = "<p>Select a linear SII-filter image to augment the " +
                              "intensification of the RGB image's R Channel.</p>";
   this.GViewList.onViewSelected = function (View) {
      trueColorData.GView = View;
   }

   // add B View picker
   this.BViewList = new ViewList(this);
   this.BViewList.width = 25;
   this.BViewList.getMainViews();
   if (trueColorData.BView) {
      this.BViewList.currentView = trueColorData.BView;
   };
   trueColorData.BView = this.BViewList.currentView;
   this.BViewList.toolTip = "<p>Select a linear OIII-filter image to augment the " +
                              "intensification of the RGB image's G and B Channels.</p>";
   this.BViewList.onViewSelected = function (View) {
      trueColorData.BView = View;
   }

   // Label for R picker
   this.RLabel = new Label(this);
      this.RLabel.margin = 10;
      this.RLabel.text = "R:";
      this.RLabel.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // Label for G picker
   this.GLabel = new Label(this);
      this.GLabel.margin = 10;
      this.GLabel.text = "      G:";
      this.GLabel.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // Label for B picker
   this.BLabel = new Label(this);
      this.BLabel.margin = 10;
      this.BLabel.text = "      B:";
      this.BLabel.textAlignment = TextAlign_Left|TextAlign_Bottom;

   // arrange broadband image selectors horizontally
   this.SelectBBViewSizer = new HorizontalSizer;
   this.SelectBBViewSizer.margin = 8;
   this.SelectBBViewSizer.spacing = 6;
   this.SelectBBViewSizer.add(this.RLabel)
   this.SelectBBViewSizer.add(this.RViewList)
   this.SelectBBViewSizer.addStretch();
   this.SelectBBViewSizer.add(this.GLabel)
   this.SelectBBViewSizer.add(this.GViewList)
   this.SelectBBViewSizer.addStretch();
   this.SelectBBViewSizer.add(this.BLabel)
   this.SelectBBViewSizer.add(this.BViewList)

   // Narrowband Image selectors
   //
   // add H View picker
   this.HViewList = new ViewList(this);
   this.HViewList.width = 25;
   this.HViewList.getMainViews();
   if (trueColorData.HView) {
      this.HViewList.currentView = trueColorData.HView;
   }
   trueColorData.HView = this.HViewList.currentView;
   this.HViewList.toolTip = "<p>Select a linear HII-filter image to augment the " +
                              "intensification of the RGB image's R and B Channels.</p>";
   this.HViewList.onViewSelected = function (View) {
      trueColorData.HView = View;
   }

   // add S View picker
   this.SViewList = new ViewList(this);
   this.SViewList.width = 25;
   this.SViewList.getMainViews();
   if (trueColorData.SView) {
      this.SViewList.currentView = trueColorData.SView;
   };
   trueColorData.SView = this.SViewList.currentView;
   this.SViewList.toolTip = "<p>Select a linear SII-filter image to augment the " +
                              "intensification of the RGB image's R Channel.</p>";
   this.SViewList.onViewSelected = function (View) {
      trueColorData.SView = View;
   }

   // add O View picker
   this.OViewList = new ViewList(this);
   this.OViewList.width = 25;
   this.OViewList.getMainViews();
   if (trueColorData.OView) {
      this.OViewList.currentView = trueColorData.OView;
   };
   trueColorData.OView = this.OViewList.currentView;
   this.OViewList.toolTip = "<p>Select a linear OIII-filter image to augment the " +
                              "intensification of the RGB image's G and B Channels.</p>";
   this.OViewList.onViewSelected = function (View) {
      trueColorData.OView = View;
   }

   // Label for H picker
   this.HLabel = new Label(this);
      this.HLabel.margin = 8;
      this.HLabel.text = "Ha:";
      this.HLabel.textAlignment = TextAlign_Left|TextAlign_Center;

   // Label for S picker
   this.SLabel = new Label(this);
      this.SLabel.margin = 10;
      this.SLabel.text = "    SII:";
      this.SLabel.textAlignment = TextAlign_Left|TextAlign_Center;

   // Label for O picker
   this.OLabel = new Label(this);
      this.OLabel.margin = 10;
      this.OLabel.text = "  OIII:";
      this.OLabel.textAlignment = TextAlign_Left|TextAlign_Center;

   // arrange narrowband image selectors horizontally
   this.SelectNBViewSizer = new HorizontalSizer;
   this.SelectNBViewSizer.margin = 8;
   this.SelectNBViewSizer.spacing = 6;
   this.SelectNBViewSizer.add(this.HLabel)
   this.SelectNBViewSizer.add(this.HViewList)
   this.SelectNBViewSizer.addStretch();
   this.SelectNBViewSizer.add(this.SLabel)
   this.SelectNBViewSizer.add(this.SViewList)
   this.SelectNBViewSizer.addStretch();
   this.SelectNBViewSizer.add(this.OLabel)
   this.SelectNBViewSizer.add(this.OViewList)

   this.ViewSelectors = new VerticalSizer;
   this.ViewSelectors.spacing = 0;
   this.ViewSelectors.add(this.SelectBBViewSizer);
   this.ViewSelectors.add(this.SelectNBViewSizer);

   // Buttons
   //
   // instance button
   this.newInstanceButton = new ToolButton( this );
   this.newInstanceButton.icon = this.scaledResource( ":/process-interface/new-instance.png" );
   this.newInstanceButton.setScaledFixedSize( 24, 24 );
   this.newInstanceButton.toolTip = "New Instance";
   this.newInstanceButton.onMousePress = () => {
      trueColorData.save();
      this.newInstance();
   };

   // doc button
   this.documentationButton = new ToolButton(this);
   this.documentationButton.icon = this.scaledResource( ":/process-interface/browse-documentation.png" );
   this.documentationButton.toolTip = "<p>See the folder containing this script " +
                                      "for the documentation </p>";

   // cancel button
   this.cancelButton = new PushButton(this);
   this.cancelButton.text = "Exit";
   this.cancelButton.backgroundColor = 0x22ff0000;
   this.cancelButton.textColor = 0xfffffff0;
   this.cancelButton.onClick = function() {
      this.dialog.cancel();
   };
   this.cancelButton.defaultButton = true;
   this.cancelButton.hasFocus = true;

   // execution button
   this.execButton = new PushButton(this);
   this.execButton.text = "RUN";
   this.execButton.toolTip = "Active only when R, G, and B images are selected";
   this.execButton.backgroundColor = 0x2200ff00;
   this.execButton.width = 40;
   this.execButton.enabled = true;
   this.execButton.onClick = () => {
      this.ok();
   };

     // create a horizontal sizer to layout the execution-row buttons
   this.execButtonSizer = new HorizontalSizer;
   this.execButtonSizer.margin = 10;
   this.execButtonSizer.width = 8;
   this.execButtonSizer.spacing = 12;
   this.execButtonSizer.add(this.newInstanceButton);
   this.execButtonSizer.add(this.documentationButton);
   this.execButtonSizer.addStretch();
   this.execButtonSizer.add(this.cancelButton);
   this.execButtonSizer.add(this.execButton)

   // Augmenting sliders
   //
   // slider--for Ha-R boost Factor
   this.HAmountControl = new NumericControl(this);
   this.HAmountControl.label.text = "Ha Boost Factor:    ";
   this.HAmountControl.label.width = 60;
   this.HAmountControl.margin = 10;
   this.HAmountControl.setRange( 0, 10 );
   this.HAmountControl.setPrecision( 2 );
   this.HAmountControl.stepSize = 0.1;
   this.HAmountControl.setValue( trueColorData.HFactor );
   this.HAmountControl.enabled = true;
   this.HAmountControl.toolTip = "<p>Sets the amount of Ha line to boost Red. " +
                                    "Values between 1.1 and 3.0 tend to work well. " +
                                    "Values < 1 are also permitted </p>";
   this.HAmountControl.onValueUpdated = function( value ) {
      if( value <=1.0 ) {
         trueColorData.HFactor = 1.000001; //there's a (compiler?) bug if it = 1.0
      } else {
         trueColorData.HFactor = value;
      }
   }

   // slider--for S-R boost Factor
   this.SAmountControl = new NumericControl(this);
   this.SAmountControl.label.text = "SII Boost Factor:  ";
   this.SAmountControl.sizer.scaledMinWidth = 30;
   this.SAmountControl.label.width = 60;
   this.SAmountControl.setRange( 0, 10 );
   this.SAmountControl.setPrecision( 2 );
   this.SAmountControl.setPrecision( 2 );
   this.SAmountControl.setValue( trueColorData.SFactor );
   this.SAmountControl.enabled = true;
   this.SAmountControl.toolTip = "<p>Sets the amount of S line to boost Red. " +
                                    "Values between 1.1 and 3.0 tend to work well. " +
                                    "Values < 1 are also permitted </p>";
   this.SAmountControl.onValueUpdated = function( value ) {
      trueColorData.SFactor = value;
   }

   // slider--for O-BG boost Factor
   this.OAmountControl = new NumericControl(this);
   this.OAmountControl.label.text = "OIII Boost Factor: ";
   this.OAmountControl.sizer.scaledMinWidth = 30;
   this.OAmountControl.label.width = 60;
   this.OAmountControl.setRange( 0, 10 );
   this.OAmountControl.setPrecision( 2 );
   this.OAmountControl.setPrecision( 2 );
   this.OAmountControl.setValue( trueColorData.OFactor );
   this.OAmountControl.enabled = true;
   this.OAmountControl.toolTip = "<p>Sets the amount of O line to boost or GB. " +
                                    "Values between 1.1 and 3.0 tend to work well. " +
                                    "Values < 1 are also permitted </p>";
   this.OAmountControl.onValueUpdated = function( value ) {
      trueColorData.OFactor = value;
   }

   // slider--for Hb Percent
   this.HbAmountControl = new NumericControl(this);
   this.HbAmountControl.label.text = "             Hb Factor (%):   ";
   this.HbAmountControl.sizer.scaledMinWidth = 30;
   this.HbAmountControl.label.width = 60;
   this.HbAmountControl.setRange( 0, 100 );
   this.HbAmountControl.setPrecision( 1 );
   this.HbAmountControl.setPrecision( 2 );
   this.HbAmountControl.setValue( trueColorData.HbPcnt );
   this.HbAmountControl.enabled = true;
   this.HbAmountControl.toolTip = "<p>Set the amount of Hb line to boost Blue.</p>";
   this.HbAmountControl.onValueUpdated = function( value ) {
      trueColorData.HbPcnt = value;
   }

   // slider--for OIII blue/green ratio
   this.OBlueGreenControl = new NumericControl(this);
   this.OBlueGreenControl.label.text = "             OIII Blue %:   ";
   this.OBlueGreenControl.sizer.scaledMinWidth = 30;
   this.OBlueGreenControl.label.width = 60;
   this.OBlueGreenControl.setRange( 0, 100 );
   this.OBlueGreenControl.setPrecision( 1 );
   this.OBlueGreenControl.setPrecision( 2 );
   this.OBlueGreenControl.setValue( trueColorData.OBPcnt );
   this.OBlueGreenControl.enabled = true;
   this.OBlueGreenControl.toolTip = "<p>Set the % of Blue, relative to green, " +
                                    "in the OIII--50% is close to the true value.</p>";
   this.OBlueGreenControl.onValueUpdated = function( value ) {
      trueColorData.OBPcnt = value;
   }

   // Capture Image Info
   //
   // broadband filters width
   this.bbWidthControl = new NumericEdit(this);
   this.bbWidthControl.sizer.width = 20;
   this.bbWidthControl.label.width = 60;
   this.bbWidthControl.label.text = "Broadband-Filter FMHW (nm):       ";
   this.bbWidthControl.setRange(1, 10);
   this.bbWidthControl.setPrecision( 0 );
   this.bbWidthControl.setRange( 1, 1000 );
   this.bbWidthControl.setValue(trueColorData.filterWidthBB);
   this.bbWidthControl.toolTip = "<p>Width of Broadband filter FWHM (nm) </p>";
   this.bbWidthControl.onValueUpdated = function( value ) {
      trueColorData.filterWidthBB = value;
   }

   // narrowband filters width
   this.nbWidthControl = new NumericEdit(this);
   this.nbWidthControl.sizer.width = 20;
   this.nbWidthControl.label.width = 60;
   this.nbWidthControl.label.text = "NarrowBand-Filter FWHHM (nm):   ";
   this.nbWidthControl.setRange(1, 20);
   this.nbWidthControl.setPrecision( 0 );
   this.nbWidthControl.setRange( 1, 1000 );
   this.nbWidthControl.setValue(trueColorData.filterWidthNB);
   this.nbWidthControl.toolTip = "<p>Width of narroband filter FWHM (nm) </p>";
   this.nbWidthControl.onValueUpdated = function( value ) {
      trueColorData.filterWidthNB = value;
   }

   // arrange filter bandpass controls horizontally
   this.filterBandpassSizer = new HorizontalSizer;
   this.filterBandpassSizer.addStretch();
   this.filterBandpassSizer.margin = 10;
   this.filterBandpassSizer.add(this.bbWidthControl)
   this.filterBandpassSizer.addStretch();
   this.filterBandpassSizer.add(this.nbWidthControl)
   this.filterBandpassSizer.addStretch();

   // narrowband exposure
   this.nbExposureControl = new NumericEdit(this);
   this.nbExposureControl.sizer.width = 20;
   this.nbExposureControl.label.width = 60;
   this.nbExposureControl.label.text = "NarrowBand-Filter Exposure (sec):";
   this.nbExposureControl.setRange(1, 10);
   this.nbExposureControl.setPrecision( 0 );
   this.nbExposureControl.setRange( 1, 5000 );
   this.nbExposureControl.setValue(trueColorData.exposureNB);
   this.nbExposureControl.toolTip = "<p>Exposure length through broadband filters in sec:</p>";
   this.nbExposureControl.onValueUpdated = function( value ) {
      trueColorData.exposureNB = value;
   }

   // broadband exposure
   this.bbExposureControl = new NumericEdit(this);
   this.bbExposureControl.sizer.width = 20;
   this.bbExposureControl.label.width = 60;
   this.bbExposureControl.label.text = "BroadBand-Filter Exposure (sec):";
   this.bbExposureControl.setRange(1, 10);
   this.bbExposureControl.setPrecision( 0 );
   this.bbExposureControl.setRange( 1, 5000 );
   this.bbExposureControl.setValue(trueColorData.exposureBB);
   this.bbExposureControl.toolTip = "<p>Exposure length through Ha filter (sec):</p>";
   this.bbExposureControl.onValueUpdated = function( value ) {
      trueColorData.exposureBB = value;
   }

   // arrange filter-exposure controls horizontally
   this.filterExposeSizer = new HorizontalSizer;
   this.filterExposeSizer.addStretch();
   this.filterExposeSizer.setAlignment = Align_Bottom;
   this.filterExposeSizer.margin = 10;
   this.filterExposeSizer.add(this.bbExposureControl)
   this.filterExposeSizer.addStretch();
   this.filterExposeSizer.add(this.nbExposureControl)
   this.filterExposeSizer.addStretch();

   // Checkboxes
   //
   // delete intermediate images? checkbox
   this.deleteIntermediateImagescheckbox = new CheckBox(this);
   this.deleteIntermediateImagescheckbox.text = "Delete Intermediate Images     ";
   this.deleteIntermediateImagescheckbox.checked = DeleteIntermediate;
   this.deleteIntermediateImagescheckbox.enabled = true;
   this.deleteIntermediateImagescheckbox.onClick = function (checked) {
      if( this.dialog.deleteIntermediateImagescheckbox.checked ) {
         DeleteIntermediate = true;
      } else {
         DeleteIntermediate = false;
      }
   }

   // Narrowband image checkboxes
   //
   // make H image?
   this.HImagecheckbox = new CheckBox(this);
   this.HImagecheckbox.text = " Make Ha-Line ";
   this.HImagecheckbox.checked = true;
   this.makeHImage = true;
   this.HImagecheckbox.enabled = true;
   this.HImagecheckbox.onClick = function (checked) {
      if( this.dialog.HImagecheckbox.checked ) {
         makeHImage = true;
      } else {
         makeHImage = false;
      }
   }

   // make S image?
   this.SImagecheckbox = new CheckBox(this);
   this.SImagecheckbox.text = " Make SII-Line ";
   this.SImagecheckbox.checked = true;
   this.makeSImage = true;
   this.SImagecheckbox.enabled = true;
   this.SImagecheckbox.onClick = function (checked) {
      if( this.dialog.SImagecheckbox.checked ) {
         makeSImage = true;
      } else {
         makeSImage = false;
      }
   }

   // make O image?
   this.OImagecheckbox = new CheckBox(this);
   this.OImagecheckbox.text = " Make OIII-Line ";
   this.OImagecheckbox.checked = true;
   this.makeOImage = true;
   this.OImagecheckbox.enabled = true;
   this.OImagecheckbox.onClick = function (checked) {
      if( this.dialog.OImagecheckbox.checked ) {
         makeOImage = true;
      } else {
         makeOImage = false;
      }
   }

   // Checkbox layout
   this.CheckboxSizer = new HorizontalSizer;
   this.CheckboxSizer.add(this.HImagecheckbox);
   this.CheckboxSizer.addStretch();
   this.CheckboxSizer.add(this.SImagecheckbox);
   this.CheckboxSizer.addStretch();
   this.CheckboxSizer.add(this.OImagecheckbox);
   this.CheckboxSizer.addStretch();
   this.CheckboxSizer.addStretch();
   this.CheckboxSizer.addStretch();
   this.CheckboxSizer.addStretch();
   this.CheckboxSizer.add(this.deleteIntermediateImagescheckbox);

   // final arrangement of controls
   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 6;
   this.sizer.add(this.title);
   this.sizer.add(this.ViewSelectors);

   // Iterate(?) dialog Checkbox
   this.IterateDialog = new CheckBox(this);
   this.IterateDialog.scaledMargin = 20;
   this.IterateDialog.text = " Iterate Dialog    ";
   this.IterateDialog.toolTip = "Check to compute the result then reopen the dialog " +
      "with the last-used values presented."
   this.IterateDialog.checked = trueColorData.Iterate;
   this.IterateDialog.enabled = true;
   this.IterateDialog.onClick = function() {
      trueColorData.Iterate = !trueColorData.Iterate;
   }

   this.CbSizer = new HorizontalSizer;
   this.CbSizer.addStretch();
   this.CbSizer.add(this.IterateDialog);


   this.sizer.add(this.HAmountControl);
   this.sizer.add(this.HbAmountControl);
   this.sizer.add(this.SAmountControl);
   this.sizer.add(this.OAmountControl);
   this.sizer.add(this.OBlueGreenControl);

   this.sizer.add(this.filterBandpassSizer);
   this.sizer.add(this.filterExposeSizer);
   this.sizer.add(this.CheckboxSizer);
   this.sizer.add(this.CbSizer);
   this.sizer.add(this.execButtonSizer);
   this.adjustToContents();
};

//                   PIXELMATH PROCESSES
//
//------------------------------------------------------------------------------
//----- Combine 1 Narrowband Image into its Respective Broadband Image ---------
//------------------------------------------------------------------------------
function AugmentBroadband ( Inb, Ibb, F, exposBB, exposNB, fwBB, fwNB, outname ) {
   // setup CONSTANTS
   let k1 = exposNB/exposBB;
   let k3 = k1*fwNB/fwBB;

   // equations that mix narrowband into the broadband channel
   let BkgnEQ = "Bkgn=("+k1+"*"+Ibb.id+"-"+Inb.id+")/("+k1+"-"+k3+"); ";
   let LineEQ = "Line=max("+Ibb.id+"-Bkgn, 0); ";
   let MixEQ = F+"*Line+Bkgn; ";
   let EQ = BkgnEQ + LineEQ + MixEQ;   // order dependent!!!

   // implement above equations in PixelMath
   var P = new PixelMath;
      P.expression = EQ;
      P.symbols = "Inb, Ibb, F, Line, Bkgn, Mix, outname";
      P.expression1 = "";
      P.expression2 = "";
      P.useSingleExpression = true;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = true;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = outname;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.Gray;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      P.executeOn(Ibb);
		var view = View.viewById(outname);
     	return view;
}

//------------------------------------------------------------------------------
//-------- Combine 2 Narrowband Images into a single Broadband Image -----------
//------------------------------------------------------------------------------
//   This function can be used to augmented Ha, O, and S, but H-beta is treated
//   in a separate function below.
function TwoImage_AugmentBroadband ( Inb1, Inb2, Ibb, F1, F2, exposBB, exposNB,
   fwBB, fwNB, outname ) {

   // setup CONSTANTS
   let K1 = exposNB/exposBB;
   let K2 = fwNB/fwBB;
   let K3 = K1*K2;
   let K4 = K2-1;

   // construct EQUATIONS for adding 2 narrowband images to a broadband image
   let Line2EQ = "Line2=max( ("+K4+"*"+Inb2.id+"/"+K3+"+"+K2+"*"+Inb1.id+"/"+K1+"-"+K2+"*"+
               Ibb.id+")/("+K4+"/"+K2+"-"+K2+"),0 );";
   let BkgnEQ = "Bkgn="+Inb2.id+"/"+K3+"-Line2/"+K2+";";
   let Line1EQ = "Line1=max("+Ibb.id+"-Bkgn"+"-Line2,0);";
   let MixEQ = F1+"*Line1+"+F2+"*Line2+Bkgn;";
   let EQ = Line2EQ + BkgnEQ + Line1EQ + MixEQ;  // order dependent!!!

   // implement above equations in PixelMath
   var P = new PixelMath;
      P.expression  = EQ;
      P.symbols = "Inb1, Inb2, Ibb, F1, F2, exposBB, exposNB, fwBB, fwNB, Bkgn," +
         "Line1, Line2";
      P.expressioInb1 = "";
      P.expressioInb2 = "";
      P.useSingleExpression = true;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = true;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = outname;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.Gray;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      P.executeOn(Ibb);
		var view = View.viewById(outname);
     	return view;
}

//------------------------------------------------------------------------------
//------ Make and display a narrowband line or background component image ------
//  ----------- according to whether opt = "Line" or "Background" --------------
//------------------------------------------------------------------------------
function NarrowBandLine ( Inb, Ibb, F, exposBB, exposNB, fwBB, fwNB, outName, opt ) {
   // setup CONSTANTS
   let k1 = exposNB/exposBB;
   let k2 = k1*fwNB/fwBB;
   let k3 = k1-k2;
   let EQ = "";

   // construct EQUATIONS for adding H-beta into blue channel
   let BkgnEQ = "("+k1+"*"+Ibb.id+"-"+Inb.id+")/"+k3+"; ";
   //let LineREQ = Ibb.id+"-Bkgn; ";
   let LineEQ = Ibb.id+"-(("+k1+"*"+Ibb.id+"-"+Inb.id+")/"+k3+")"
   if( opt == "LINE" ) {
      EQ = "max("+LineEQ+",0.000001)"; //cushioned!
   } else {
      EQ = "max("+BkgnEQ+",0.000001)"; //cushioned!
   }

   // implement above equations in PixelMath
   var P = new PixelMath;
      P.expression = "";
      P.expression  = EQ;
      P.symbols = "Inb, Ibb, Tnb, Tbb, Wnb, Wbb, Bkgn, Line, Mix, F";
      P.expression1 = "";
      P.expression2 = "";
      P.useSingleExpression = true;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = true;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = outName;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.Gray;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      P.executeOn(Ibb); // dummy
		var view = View.viewById(outName);
     	return view;
}

//------------------------------------------------------------------------------
//------------------------ Combine SHORGB images -------------------------------
//------------------------------------------------------------------------------
//     OK, this is a poor way to do it, but I tried to figure out how to
//     to use LRGBCombine, and got nowhere. So, this is what I know and
//     this is what I did!
//------------------------------------------------------------------------------
function FinalImageCombine ( R, G, B, outname ) {
   var P = new PixelMath;
      P.expression = R.id;
      P.expression1 = G.id;
      P.expression2 = B.id;
      P.symbols = "R, G, B";
      P.useSingleExpression = false;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = true;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = outname;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.RGB;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      P.executeOn(R); // dummy
		var view = View.viewById(outname);
     	return view;
}

//------------------------------------------------------------------------------
//----- PM: copy an image to a new id...I'm sure there's a better way! ---------
//------------------------------------------------------------------------------
//     OK, this is a poor way to do it, but I tried to figure if there were
//     ways, and got nowhere. So, this is what I know and this is what I did!
//------------------------------------------------------------------------------
function ImageTransfer ( source, outname) {
   var P = new PixelMath;
      P.expression = source.id;
      P.expression1 = "";
      P.expression2 = "";
      P.symbols = "source";
      P.useSingleExpression = true;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = true;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = outname;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      P.executeOn(source);
		let view = View.viewById(outname);
     	return view;
}

//------------------------------------------------------------------------------
//-------- LinearFit images in the input arrary to the SourceImage -------------
//------------------------------------------------------------------------------
// fashioned after NBRGBCombination, but BatchLinearFit, line 257 looks simpler
function LinearFit_subs ( TargetImage, SourceImage ) {
   var P = new LinearFit;
      P.referenceViewId = SourceImage.id
      P.rejectLow = 0.000000;
      P.rejectHigh = 0.920000;
      P.executeOn( TargetImage );
}

//------------------------------------------------------------------------------
//------------- Apply STF to final images, if requested ------------------------
//---------- Fashioned after STFAutoStretch by J. Conejero ---------------------
//--------- Only applicable to linked channels if RGB image---------------------
//------------------------------------------------------------------------------
function ApplySTF ( TargetImage ) {
   let shadowsClipping = -2.80;  // MAD units
   let targetBackground = 0.25;  // Mad Units
   let rgbLinked = true;

   let stf = new ScreenTransferFunction;
   let n = TargetImage.image.isColor ? 3 : 1; // n channels
   let median = TargetImage.computeOrFetchProperty( "Median" );
   let mad = TargetImage.computeOrFetchProperty( "MAD" );
   mad.mul( 1.4826 ); // coherent with a normal distribution

   // find values for median across channels (3 rgb)
   let c0 = 0, m = 0;
   for ( var c = 0; c < n; ++c )
   {
      if ( 1 + mad.at( c ) !== 1 )
         c0 += median.at( c ) + shadowsClipping * mad.at( c );
      m  += median.at( c );
   }

   // values of ShadowClipping and and Median in pixel-intensity units
   // these are returned for subsequent uses, if any. To do so, see
   // https://stackoverflow.com/questions/4937665/returning-multiple-values-in-javascript
   c0 = Math.range( c0/n, 0.0, 1.0 );
   m = Math.mtf( targetBackground, m/n - c0 );

   stf.STF = [ // c0, c1, m, r0, r1
               [c0, 1, m, 0, 1],
               [c0, 1, m, 0, 1],
               [c0, 1, m, 0, 1],
               [0, 1, 0.5, 0, 1] ];

   stf.executeOn ( TargetImage );
}

//------------------------------------------------------------------------------
//------------------------ Which Images to Use? --------------------------------
//------------------------------------------------------------------------------
function SetImagesToUse() {
   with (trueColorData) {
      HaveR = RView.id != "";
      HaveG = GView.id != "";
      HaveB = BView.id != "";
      HaveH = HView.id != "";
      HaveS = SView.id != "";
      HaveO = OView.id != "";
   }
}

//------------------------------------------------------------------------------
//------------------------------- Show-and-Tell --------------------------------
//------------------------------------------------------------------------------
function Show_N_Tell() {
   SetImagesToUse();
   with (trueColorData) {
      // Record info on Console
      Console.writeln ("<p>R image: ", RView.id);
      Console.writeln ("G image: ", GView.id);
      Console.writeln ("B image: ", BView.id);
      HaveH ? Console.writeln ("H image: ", HView.id) :
              Console.writeln ("H image not specified");
      HaveS ? Console.writeln ("S image: ", SView.id) :
              Console.writeln ("S image not specified");
      HaveO ? Console.writeln ("O image: ", OView.id):
              Console.writeln ("O image not specified");

      Console.writeln ("Broadband Exposures:  ", exposureBB);
      Console.writeln ("Narrowband Exposures: ", exposureNB);
      Console.writeln ("Broadband Filter Width:  ", filterWidthBB);
      Console.writeln ("Narrowband Filter Width: ", filterWidthNB);

      Console.writeln ("Parameters: Ha Enhancement Factor = ", HFactor);
      Console.writeln ("            Hb Enhancement Pcnt   = ", HbPcnt);
      Console.writeln ("            S  Enhancement Factor = ", SFactor);
      Console.writeln ("            O  Enhancement Factor = ", OFactor);
      Console.writeln ("            OIII Blue Percent     = ", OBPcnt);
      Console.writeln ();
   }
};

//------------------------------------------------------------------------------
//------------------- Data Muncher...where the action is -----------------------
//------------------------------------------------------------------------------
function ImageMuncher () {
   Console.show();
   with (trueColorData) {
      let OBF, OGF, HbF

      if( HaveH ) {
         HbF = (HFactor-1)*HbPcnt/100.0+1;
      } else {
         HbF = 0;
      }
      if( HaveO ) {
         OBF = OBPcnt*OFactor/100.0;
         OGF = (1-OBPcnt/100.0)*OFactor;
      } else {
         OBF = 0;
         OGF - 0;
      }

      // Combine H-alpha and/or S with Red channel
      if ( !HaveH && !HaveS ) {
         RHS_amp = ImageTransfer( RView, "RHS_amp" );
      } else if( HaveH && !HaveS ) {
         RHS_amp = AugmentBroadband ( HView, RView, HFactor,
            exposureBB, exposureNB, filterWidthBB, filterWidthNB, "RHS_amp" );
      } else if( HaveS && !HaveH ) {
         RHS_amp = AugmentBroadband ( SView, RView, SFactor,
            exposureBB, exposureNB, filterWidthBB, filterWidthNB, "RHS_amp" );
      } else {  //have both
         RHS_amp = TwoImage_AugmentBroadband( HView, SView, RView,
            HFactor, SFactor, exposureBB, exposureNB,
            filterWidthBB, filterWidthNB, "RHS_amp" )
      }
      Console.writeln ("Red image Completed");

      // Combine estimate H-beta and/or O with Blue channel
      if ( !HaveH && !HaveO ) {
         BHO_amp = ImageTransfer( BView, "BHO_amp" );
      } else if( HaveH && !HaveO ) {
         BHO_amp = AugmentBroadband ( HView, BView, HbF, exposureBB, exposureNB,
            filterWidthBB, filterWidthNB, "BHO_amp" );
      } else if( HaveS && !HaveH ) {
         BHO_amp = AugmentBroadband ( OView, BView, OBF, exposureBB, exposureNB,
            filterWidthBB, filterWidthNB, "BHO_amp" );
      } else {  //have both
         BHO_amp = TwoImage_AugmentBroadband( HView, OView, BView, HbF, OBF,
            exposureBB, exposureNB, filterWidthBB, filterWidthNB, "BHO_amp" )
      }
      Console.writeln ("Blue image Completed");

      // Combine O with Green channel
      if ( !HaveO ) {
         GO_amp = ImageTransfer( GView, "GO_amp" );
      } else {
         GO_amp = AugmentBroadband ( OView, GView, OGF, exposureBB, exposureNB,
            filterWidthBB, filterWidthNB, "GO_amp" );
      }
      Console.writeln ("Green image Completed");

      // LinearFit to red image
      LinearFit_subs ( GO_amp, RHS_amp );
      GO_amp.id = "GO_amp_linfit";
      LinearFit_subs ( BHO_amp, RHS_amp );
      BHO_amp.id = "BHO_amp_linfit";
      Console.writeln ("Linear Fitting Completed");

      // Narrowband lines extraction
      //
      if ( HaveH && makeHImage ) {
         // Make the H-alpha line image
         Ha_LINE = NarrowBandLine( HView, RView, 1.0, exposureBB, exposureNB,
         filterWidthBB, filterWidthNB, "Ha_LINE", "LINE" );
         Console.writeln ("Extracted H-Line");
         // STF it
         ApplySTF ( ImageWindow.activeWindow.mainView ); // avoid naming issues
         Console.writeln ( "ScreenStretch applied to H-Line image" );
      }

      if ( HaveS && makeSImage) {
         // Make the SII line image
         SII_LINE = NarrowBandLine( SView, RView, 1.0, exposureBB, exposureNB,
         filterWidthBB, filterWidthNB, "SII_LINE", "LINE" );
         Console.writeln ("Extracted SII-Line");
         // STF it
         ApplySTF ( ImageWindow.activeWindow.mainView ); // avoid naming issues
         Console.writeln ( "ScreenStretch applied to SII_Line image" );
      }
      if ( HaveO && makeOImage ) {
         // Make the OIII line image from the blue
         OIII_LINE = NarrowBandLine( OView, BView, 1.0, exposureBB, exposureNB,
         filterWidthBB, filterWidthNB, "OIII_LINE", "LINE" );
         Console.writeln ("Extracted OIII-Line");
         // STF it
         ApplySTF ( ImageWindow.activeWindow.mainView ); // avoid naming issues
         Console.writeln ( "ScreenStretch applied to OIII-Line image" );
      }

      // combine LinearFit images into a final SHO_RGB image
      let imageName = "RGB";
      if ( HaveO ) imageName = "O" + imageName;
      if ( HaveH ) imageName = "H" + imageName;
      if ( HaveS ) imageName = "S" + imageName;
      FinalImageCombine ( RHS_amp, GO_amp, BHO_amp, imageName );

      // Remove intermediate images?
      if ( DeleteIntermediate ) {
         GO_amp.window.forceClose();
         BHO_amp.window.forceClose();
         RHS_amp.window.forceClose();
      }
      // A screen-stretch for good measure
      ApplySTF ( ImageWindow.activeWindow.mainView ); // avoid naming issues
      Console.writeln ( "ScreenStretch applied to final RGB image" );
   }
};

//------------------------------------------------------------------------------
parametersDialogPrototype.prototype = new Dialog;
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
function main() {
   Console.abortEnabled = true;

   if (Parameters.isGlobalTarget) {
      trueColorData.load();
   }

   if (Parameters.isViewTarget) {
      with (trueColorData) {
         trueColorData.load();
         SetImagesToUse();
         Show_N_Tell();
         if( !HaveR || !HaveG ||!HaveB ) {
            Console.criticalln("R, G, and B required! <p> EXITING");
            return;
         }
         save();
         ImageMuncher();
         return;
      }
   }

    // execute via user interface
   let parametersDialog = new parametersDialogPrototype();
   if( parametersDialog.execute() == 0 ) return;

   // normal execution via a dialog
   with (trueColorData) {
      SetImagesToUse();
      Show_N_Tell();
      if( !HaveR || !HaveG ||!HaveB ) {
         Console.criticalln("R, G, and B required! <p> EXITING");
         return;
      }
      save();
      ImageMuncher();
      if( Iterate ) {
         main();  // reopen with filled-in dialog
      } else {
         Console.writeln ("DONE");
         Console.hide();
      }
   }
};

main();

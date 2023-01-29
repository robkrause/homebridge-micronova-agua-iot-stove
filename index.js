/*
homebridge-micronova-agua-iot-stove
Homebridge plugin to manage a Micronova's Agua IOT WiFi module controlled stove.
Licensed under AGPL-3.0-only License [https://www.gnu.org/licenses/agpl-3.0.en.html].
Copyright (C) 2021, @securechicken
*/

const PLUGIN_NAME = "homebridge-micronova-agua-iot-stove";
const PLUGIN_AUTHOR = "@securechicken";
const PLUGIN_VERSION = "1.1.0";
const PLUGIN_DEVICE_MANUFACTURER = "Micronova Agua IOT";
const ACCESSORY_PLUGIN_NAME = "HeaterCoolerMicronovaAguaIOTStove";

const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");

module.exports = (api) => {
	api.registerAccessory(ACCESSORY_PLUGIN_NAME, HeaterCoolerMicronovaAguaIOTStove);
};

// Mapping of supported brands and associated settings.
const MAP_SUPPORTED_BRANDS = new Map([
	["piazzetta", ["458632", "https://piazzetta.agua-iot.com/", "https://piazzetta-iot.app2cloud.it/api/bridge/endpoint/"]],
	["evastampaggi", ["635987", "https://evastampaggi.agua-iot.com/"]],
	["nordicfire", ["132678", "https://nordicfire.agua-iot.com/"]],
	["alphaplam", ["862148", "https://alfaplam.agua-iot.com/"]],
	["elfire", ["402762", "https://elfire.agua-iot.com/"]],
	["karmekone", ["403873", "https://karmekone.agua-iot.com/"]],
	["mcz1", ["354924", "https://remote.mcz.it/"]],
	["mcz2", ["746318", "https://remote.mcz.it/"]],
	["mcz3", ["354925", "https://remote.mcz.it/"]],
	["lorflam", ["121567", "https://lorflam.agua-iot.com/"]],
	["laminox", ["352678", "https://laminox.agua-iot.com/"]],
	["boreal", ["173118", "https://boreal.agua-iot.com/"]],
	["bronpi", ["164873", "https://bronpi.agua-iot.com/"]],
	["solartecnik", ["326495", "https://solartecnik.agua-iot.com/"]],
	["jollymec", ["732584", "https://jollymec.agua-iot.com/"]],
	["globefire", ["634876", "https://globefire.agua-iot.com/"]],
	["timsistem", ["046629", "https://timsistem.agua-iot.com/"]],
	["stufepelletitalia", ["015142", "https://stufepelletitalia.agua-iot.com/"]],
	["mycorisit", ["101427", "https://mycorisit.agua-iot.com/"]],
	["fonteflame", ["848324", "https://fonteflame.agua-iot.com/"]],
	["klover", ["143789", "https://klover.agua-iot.com/"]],
	["amg", ["859435", "https://amg.agua-iot.com/"]],
	["lineavz", ["521228", "https://lineavz.agua-iot.com/"]],
	["thermoflux", ["391278", "https://thermoflux.agua-iot.com/"]],
	["cola", ["475219", "https://cola.agua-iot.com/"]],
	["moretti", ["624813", "https://moretti.agua-iot.com/"]],
	["fontanaforni", ["505912", "https://fontanaforni.agua-iot.com/"]],
	["nina", ["999999", "https://micronova.agua-iot.com/"]]
]);

// Stove status registers (data) constants
const REGISTER_KEY_ID = "reg_key";
const REGISTER_KEY_OFFSET = "offset";
const REGISTER_KEY_TYPE = "reg_type";
const REGISTER_KEY_FORMULA = "formula";
const REGISTER_KEY_FORMULAREV = "formula_inverse";
const REGISTER_KEY_FORMAT = "format_string";
const REGISTER_KEY_MIN = "set_min";
const REGISTER_KEY_MAX = "set_max";
const REGISTER_KEY_STEP = "step";
const REGISTER_KEY_MASK = "mask";
const REGISTER_KEY_ENCVAL = "enc_val";
const REGISTER_ENCVAL_KEY_LANG = "lang";
const REGISTER_ENCVAL_KEY_DESC = "description";
const REGISTER_ENCVAL_KEY_VAL = "value";
const REGISTER_INTERNAL_KEY_VALUE = "_v";
const REGISTER_INTERNAL_KEY_VALUEON = "_onv";
const REGISTER_INTERNAL_KEY_VALUEOFF = "_offv";
const REGISTER_VALUE_ENCVAL_LANG = "ENG";
const REGISTER_VALUE_ENCVAL_DESC_ON = "ON";
const REGISTER_VALUE_ENCVAL_DESC_OFF = "OFF";
const REGISTER_VALUE_FORMULA_VALPH = "#";
const REGISTER_VALUE_FORMULA_REGEX = /^([()\d][+\-*/]?)+$/;
const REGISTER_VALUE_STRING_VALPH = "{0}";

// API related constants
// Doc: http://<brand>.agua-iot.com:3001/api-docs/
const HTTP_TIMEOUT = 7000; // 7s in ms, web API can be laggy
const HTTP_RETRY_DELAY = 10000; // 10s in ms
const HTTP_STATUS_UNAUTH = 401;
const HTTP_REQ_ACCEPT_HEADER = "Accept";
const HTTP_REQ_CONTENT_HEADER = "Content-Type";
const HTTP_REQ_ORIGIN_HEADER = "Origin";
const HTTP_REQ_ID_BRAND_HEADER = "id_brand";
const HTTP_REQ_CUSTOMER_CODE_HEADER = "customer_code";
const HTTP_REQ_UA_HEADER = "User-Agent";
const HTTP_REQ_LOCAL_HEADER = "local";
const HTTP_REQ_AUTH_HEADER = "Authorization";
const HTTP_REQ_PIAZZETTA_URL = "url";
const HTTP_REQ_PIAZZETTA_APP_VERSION = "applicationversion";
const HTTP_REQ_PIAZZETTA_APP_VERSION_VALUE = "1.9.0";
const HTTP_ACCEPT = "application/json, text/javascript, */*; q=0.01";
const HTTP_CONTENT = "application/json";
const HTTP_ORIGIN = "file://";
const HTTP_ID_BRAND = "1";
const HTTP_UA = "homebridge-micronova-agua-iot-stove/" + PLUGIN_VERSION;
const API_ALIENS = ["piazzetta"];
const API_APPSIGNUP = "appSignup";
const POST_API_APPSIGNUP_KEY_TYPE = "phone_type";
const POST_API_APPSIGNUP_KEY_ID = "phone_id";
const POST_API_APPSIGNUP_KEY_VERSION = "phone_version";
const POST_API_APPSIGNUP_KEY_LANG = "language";
const POST_API_APPSIGNUP_KEY_IDAPP = "id_app";
const POST_API_APPSIGNUP_KEY_PUSHTOKEN = "push_notification_token";
const POST_API_APPSIGNUP_KEY_PUSHACTIVE = "push_notification_active";
const POST_API_APPSIGNUP_VALUE_TYPE = "Android";
const POST_API_APPSIGNUP_VALUE_LANG = "en";
const POST_API_APPSIGNUP_VALUE_PUSHACTIVE = false;
const API_LOGIN = "userLogin";
const POST_API_LOGIN_KEY_LOGIN = "email";
const POST_API_LOGIN_KEY_PASSWORD = "password";
const RESP_API_LOGIN_KEY_TOKEN = "token";
const RESP_API_LOGIN_KEY_REFRESHTOKEN = "refresh_token";
const API_REFRESHTOKEN = "refreshToken";
const POST_API_REFRESHTOKEN_KEY_REFRESHTOKEN = RESP_API_LOGIN_KEY_REFRESHTOKEN;
const API_DEVICESLIST = "deviceList";
const RESP_API_DEVICESLIST_KEY_DEVICES = "device";
const RESP_API_DEVICESLIST_KEY_DEVICE_ID = "id_device";
const RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT = "id_product";
const RESP_API_DEVICESLIST_KEY_DEVICE_NAME = "name";
const API_DEVICEINFO = "deviceGetInfo";
const POST_API_DEVICEINFO_KEY_ID = RESP_API_DEVICESLIST_KEY_DEVICE_ID;
const POST_API_DEVICEINFO_KEY_PRODUCT = RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT;
const RESP_API_DEVICEINFO_KEY_INFO = "device_info";
const RESP_API_DEVICEINFO_KEY_REGISTERSMAP_ID = "id_registers_map";
const API_DEVICEREGISTERSMAP = "deviceGetRegistersMap";
const POST_API_DEVICEREGISTERSMAP_KEY_ID = RESP_API_DEVICESLIST_KEY_DEVICE_ID;
const POST_API_DEVICEREGISTERSMAP_KEY_PRODUCT = RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT;
const POST_API_DEVICEREGISTERSMAP_KEY_LAST_UPDATE = "last_update";
const RESP_API_DEVICEREGISTERSMAP_KEY_L1 = "device_registers_map";
const RESP_API_DEVICEREGISTERSMAP_KEY_L2 = "registers_map";
const RESP_API_DEVICEREGISTERSMAP_KEY_ID = "id";
const RESP_API_DEVICEREGISTERSMAP_KEY_REGISTERS = "registers";
const RESP_API_DEVICEREGISTERSMAP_REGISTER_KEYS = [REGISTER_KEY_TYPE, REGISTER_KEY_OFFSET, REGISTER_KEY_FORMULA, REGISTER_KEY_FORMULAREV, REGISTER_KEY_FORMAT, REGISTER_KEY_MIN, REGISTER_KEY_MAX, REGISTER_KEY_STEP, REGISTER_KEY_MASK];
const API_DEVICEREAD = "deviceRequestReading";
const POST_API_DEVICEREAD_KEY_ID = RESP_API_DEVICESLIST_KEY_DEVICE_ID;
const POST_API_DEVICEREAD_KEY_PRODUCT = RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT;
const POST_API_DEVICEREAD_KEY_PROTO = "Protocol";
const POST_API_DEVICEREAD_KEY_BITDATA = "BitData";
const POST_API_DEVICEREAD_KEY_ENDIANESS = "Endianess";
const POST_API_DEVICEREAD_KEY_FREQ = "Freq";
const POST_API_DEVICEREAD_KEY_ITEMS = "Items";
const POST_API_DEVICEREAD_KEY_MASKS = "Masks";
const POST_API_DEVICEREAD_KEY_VALUES = "Values";
const POST_API_DEVICEREAD_VALUE_PROTO = "RWMSmaster";
const POST_API_DEVICEREAD_VALUE_BITDATA = 8;
const POST_API_DEVICEREAD_VALUE_ENDIANESS = "L";
const POST_API_DEVICEREAD_VALUE_FREQ = 0;
const RESP_API_DEVICEREAD_KEY_JOBID = "idRequest";
const API_DEVICEWRITE = "deviceRequestWriting";
const POST_API_DEVICEWRITE_KEY_ID = RESP_API_DEVICESLIST_KEY_DEVICE_ID;
const POST_API_DEVICEWRITE_KEY_PRODUCT = RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT;
const POST_API_DEVICEWRITE_KEY_PROTO = POST_API_DEVICEREAD_KEY_PROTO;
const POST_API_DEVICEWRITE_KEY_BITDATA = POST_API_DEVICEREAD_KEY_BITDATA;
const POST_API_DEVICEWRITE_KEY_ENDIANESS = POST_API_DEVICEREAD_KEY_ENDIANESS;
const POST_API_DEVICEWRITE_KEY_ITEMS = POST_API_DEVICEREAD_KEY_ITEMS;
const POST_API_DEVICEWRITE_KEY_MASKS = POST_API_DEVICEREAD_KEY_MASKS;
const POST_API_DEVICEWRITE_KEY_VALUES = POST_API_DEVICEREAD_KEY_VALUES;
const POST_API_DEVICEWRITE_VALUE_PROTO = POST_API_DEVICEREAD_VALUE_PROTO;
const POST_API_DEVICEWRITE_VALUE_BITDATA = POST_API_DEVICEREAD_VALUE_BITDATA;
const POST_API_DEVICEWRITE_VALUE_ENDIANESS = POST_API_DEVICEREAD_VALUE_ENDIANESS;
const RESP_API_DEVICEWRITE_KEY_JOBID = RESP_API_DEVICEREAD_KEY_JOBID;
const API_DEVICEJOBSTATUS = "deviceJobStatus";
const API_DEVICEJOBSTATUS_MAX_RETRIES = 15;
const API_DEVICEJOBSTATUS_DELAY_RETRY = 1000; // 1000 ms
const RESP_API_DEVICEJOBSTATUS_KEY_STATUS = "jobAnswerStatus";
const RESP_API_DEVICEJOBSTATUS_KEY_RESULT = "jobAnswerData";
const RESP_API_DEVICEJOBSTATUS_RESULT_KEY_ITEMS = POST_API_DEVICEWRITE_KEY_ITEMS;
const RESP_API_DEVICEJOBSTATUS_RESULT_KEY_VALUES = POST_API_DEVICEWRITE_KEY_VALUES;
const RESP_API_DEVICEJOBSTATUS_RESULT_WRITE_KEY_ERRCODE = "NackErrCode";
const RESP_API_DEVICEJOBSTATUS_VALUE_STATUS_OK = "completed";
const RESP_API_DEVICEJOBSTATUS_VALUE_STATUS_NTD = "terminated";
const DATE_NEVER = "1970-01-01T00:00:00.000Z";
const API_AUTH_REFRESH_DELAY = 14400000; // 4h in ms
const API_UPDATE_VALUES_DELAY = 3600000; // 1h in ms

// Module stove management constants
const POWER_SWING_PROTECTION_DELAY = 3600000; // 1h in ms
const STOVE_ALARM_REGISTER = "alarms_get";
const STOVE_ALARM_IGNORE_VALUES = [0]; // 0 is no alarm
const STOVE_POWER_STATE_INFO_REGISTER = "status_managed_get";
const STOVE_POWER_STATE_SET_ON_REGISTER = STOVE_POWER_STATE_INFO_REGISTER;
const STOVE_POWER_STATE_SET_OFF_REGISTER = STOVE_POWER_STATE_INFO_REGISTER;
const STOVE_STATE_REGISTER = "status_get";
const STOVE_CURRENT_TEMP_REGISTER = "temp_air_get";
const STOVE_SET_TEMP_REGISTER = "temp_air_set";
const STOVE_CURRENT_POWER_REGISTER = "power_set"; // real_power_get for applied power
const STOVE_SET_POWER_REGISTER = "power_set";
const STOVE_REGISTERS_CACHE_KEEP = 10000; // 10s in ms
const STOVE_READ_REGISTERS = [STOVE_ALARM_REGISTER, STOVE_POWER_STATE_INFO_REGISTER, STOVE_STATE_REGISTER, STOVE_CURRENT_TEMP_REGISTER, STOVE_SET_TEMP_REGISTER, STOVE_CURRENT_POWER_REGISTER];

class HeaterCoolerMicronovaAguaIOTStove {
	constructor(log, config, api) {
		// Intro common module init
		this.config = config;
		this.api = api;
		this.log = log;
		this.Service = this.api.hap.Service;
		this.Characteristic = this.api.hap.Characteristic;

		if (!( (this.config) && (this.config.brand) && (this.config.login) && (this.config.password) )) {
			this.log.error("Plugin configuration is not valid: every value must be set");
			return;
		}
		this._debug("init config for " + this.config.brand + " brand with login: " + this.config.login);

		// Mappings between HomeKit states and API returned one.
		this.defaultStatePair = [this.Characteristic.Active.ACTIVE, this.Characteristic.CurrentHeaterCoolerState.IDLE];
		this.stateMap = new Map([
			[0, [this.Characteristic.Active.INACTIVE, this.Characteristic.CurrentHeaterCoolerState.INACTIVE]], // OFF, OFF E
			[1, [this.Characteristic.Active.ACTIVE, this.Characteristic.CurrentHeaterCoolerState.HEATING]], // LOAD PELLETS
			[2, [this.Characteristic.Active.ACTIVE, this.Characteristic.CurrentHeaterCoolerState.HEATING]], // AWAITING FLAME
			[3, [this.Characteristic.Active.ACTIVE, this.Characteristic.CurrentHeaterCoolerState.HEATING]], // LIGHTING
			[4, [this.Characteristic.Active.ACTIVE, this.Characteristic.CurrentHeaterCoolerState.HEATING]], // WORRKING
			[5, [this.Characteristic.Active.ACTIVE, this.Characteristic.CurrentHeaterCoolerState.HEATING]], // ASHPAN CLEANING
			[6, this.defaultStatePair], // FINAL CLEANING
			[7, this.defaultStatePair], // STANDBY
			[8, this.defaultStatePair], // ALARM
			[9, this.defaultStatePair], // ALARM MEMORY
			[10, this.defaultStatePair], // JOLLY MEC = ?
			[11, this.defaultStatePair], // JOLLY MEC = ? 
			[12, this.defaultStatePair], // ?
		]);

		// Authentication and API root URL infos
		this.apiRoot = MAP_SUPPORTED_BRANDS.get(this.config.brand)[1];
		this.apiCustomerCode = MAP_SUPPORTED_BRANDS.get(this.config.brand)[0];
		this.apiAppUUID = this.api.hap.uuid.generate(PLUGIN_NAME);
		this.apiPhoneUUID = this.api.hap.uuid.generate(this.config.login);
		this.apiIsAuth = false;
		this.apiAuthToken = null;
		this.apiAuthRefreshToken = null;
		this.jobAutoLogin = null;
		this.apiHTTPHeaders = {};
		this.apiHTTPHeaders[HTTP_REQ_ACCEPT_HEADER] = HTTP_ACCEPT;
		this.apiHTTPHeaders[HTTP_REQ_CONTENT_HEADER] = HTTP_CONTENT;
		this.apiHTTPHeaders[HTTP_REQ_ORIGIN_HEADER] = HTTP_ORIGIN;
		this.apiHTTPHeaders[HTTP_REQ_ID_BRAND_HEADER] = HTTP_ID_BRAND;
		this.apiHTTPHeaders[HTTP_REQ_CUSTOMER_CODE_HEADER] = this.apiCustomerCode;
		this.apiHTTPHeaders[HTTP_REQ_UA_HEADER] = HTTP_UA;
		// Stove device
		this.apiStoveDeviceID = null;
		this.apiStoveDeviceProduct = null;
		// Stove registers and associated data
		this.apiStoveRegisters = null; // { registername: {register_key: value, ...}, ...}
		this.apiStoveOffsetsRegistersMap = new Map(); // { offset: [registername, ...], ...}
		this.apiStoveAlarmsMap = new Map(); // { value: "error code", ...}
		this.apiStoveRegistersSet = false; // Registers map initialized from API 
		this.lastStoveRegistersUpdate = null; // Last update of registers data from API, to enable cache
		// Magic object value to ensure an ongoing API read job is completed before any
		// other one is scheduled
		this.apiPendingReadJob = false;
		// Anti power swinging protection
		this.lastStovePowerChange = null;
		// Default characteristics value when nothing is available yet
		this.stoveCharDefaultActive = this.Characteristic.Active.INACTIVE;
		this.stoveCharDefaultState = this.Characteristic.CurrentHeaterCoolerState.INACTIVE;
		this.stoveCharDefaultTemp = 0;
		this.stoveCharDefaultSetTemp = 0;
		this.stoveCharDefaultPower = 0;

		// Heater Cooler service
		const sname = this.config.name || ACCESSORY_PLUGIN_NAME;
		this.stoveService = new this.Service.HeaterCooler(sname);
		// Device infos
		this.infoService = new this.Service.AccessoryInformation()
			.setCharacteristic(this.Characteristic.Name, sname)
			.setCharacteristic(this.Characteristic.Manufacturer, PLUGIN_DEVICE_MANUFACTURER)
			.setCharacteristic(this.Characteristic.Model, this.config.brand)
			.setCharacteristic(this.Characteristic.SerialNumber, this.apiPhoneUUID)
			.setCharacteristic(this.Characteristic.SoftwareRevision, PLUGIN_NAME)
			.setCharacteristic(this.Characteristic.FirmwareRevision, PLUGIN_VERSION)
			.setCharacteristic(this.Characteristic.HardwareRevision, PLUGIN_AUTHOR);

		// Register app at start, then login, then get a stove device, and associated values
		this._initPluginFromAPI();
		
		// Set characteristics properties boundaries and valid values
		// Setting CurrentHeaterCoolerState and TargetHeaterCoolerState allows to
		// lock device to heater mode only
		this.stoveService.getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
			.setProps({
				minValue: this.Characteristic.CurrentHeaterCoolerState.INACTIVE,
				maxValue: this.Characteristic.CurrentHeaterCoolerState.HEATING,
				validValues: [this.Characteristic.CurrentHeaterCoolerState.INACTIVE, this.Characteristic.CurrentHeaterCoolerState.IDLE, this.Characteristic.CurrentHeaterCoolerState.HEATING]
			});
		this.stoveService.getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
			.setProps({
				minValue: this.Characteristic.TargetHeaterCoolerState.HEAT,
				maxValue: this.Characteristic.TargetHeaterCoolerState.HEAT,
				validValues: [this.Characteristic.TargetHeaterCoolerState.HEAT]
			});
		this.stoveService.getCharacteristic(this.Characteristic.LockPhysicalControls)
			.setProps({
				minValue: this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED,
				maxValue: this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED,
				validValues: [this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED]
			});
		this.stoveService.getCharacteristic(this.Characteristic.SwingMode)
			.setProps({
				minValue: this.Characteristic.SwingMode.SWING_DISABLED,
				maxValue: this.Characteristic.SwingMode.SWING_DISABLED,
				validValues: [this.Characteristic.SwingMode.SWING_DISABLED]
			});
		this.stoveService.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
			.setProps({
				minValue: this.Characteristic.TemperatureDisplayUnits.CELSIUS,
				maxValue: this.Characteristic.TemperatureDisplayUnits.CELSIUS,
				validValues: [this.Characteristic.TemperatureDisplayUnits.CELSIUS]
			});
		// Forced initial arbitrary states
		this.stoveService.setCharacteristic(this.Characteristic.Active, this.stoveCharDefaultActive);
		this.stoveService.setCharacteristic(this.Characteristic.CurrentHeaterCoolerState, this.stoveCharDefaultState);
		this.stoveService.setCharacteristic(this.Characteristic.TargetHeaterCoolerState, this.stoveCharDefaultState);
		this.stoveService.setCharacteristic(this.Characteristic.TemperatureDisplayUnits, this.Characteristic.TemperatureDisplayUnits.CELSIUS);
		this.stoveService.setCharacteristic(this.Characteristic.LockPhysicalControls, this.Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
		this.stoveService.setCharacteristic(this.Characteristic.SwingMode, this.Characteristic.SwingMode.SWING_DISABLED);
	}

	// Mandatory services export method
	getServices() {
		return [this.infoService, this.stoveService];
	}

	// Debug logs output
	_debug(message) {
		if (this.config.debug) {
			this.log.info("[DEBUG] " + message);
		} else {
			this.log.debug(message);
		}
	}

	// Init plugin from API required data
	_initPluginFromAPI() {
		this._registerAPIApp( (err, appok) => {
			if (appok || !err) {
				this._setAPILogin(false, (err, tokok) => {
					if (tokok || !err) { 
						this._getAPIStoveDevice( (err, okmap) => {
							if (okmap || !err) {
								// Set API provided characteristics limits
								this._getStoveRegisterBoundaries(STOVE_CURRENT_TEMP_REGISTER, (err, boundaries) => {
									if (boundaries || !err) {
										this.stoveService.getCharacteristic(this.Characteristic.CurrentTemperature)
											.setProps({minValue: boundaries[0], maxValue: boundaries[1], minStep: boundaries[2]});
										this.stoveCharDefaultTemp = boundaries[0];
									} else {
										this.log.error("init could not get stove current temperature boundaries: " + err);
									}
								});
								this._getStoveRegisterBoundaries(STOVE_SET_TEMP_REGISTER, (err, boundaries) => {
									if (boundaries || !err) {
										this.stoveService.getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
											.setProps({minValue: boundaries[0], maxValue: boundaries[1], minStep: boundaries[2]});
										this.stoveCharDefaultSetTemp = boundaries[0];
									} else {
										this.log.error("init could not get stove temperature threshold boundaries: " + err);
									}
								});
								this._getStoveRegisterBoundaries(STOVE_SET_POWER_REGISTER, (err, boundaries) => {
									if (boundaries || !err) {
										this.stoveService.getCharacteristic(this.Characteristic.RotationSpeed)
											.setProps({minValue: boundaries[0], maxValue: boundaries[1], minStep: boundaries[2]});
										this.stoveCharDefaultPower = boundaries[0];
									} else {
										this.log.error("init could not get stove power boundaries: " + err);
									}
								});
								// Ask for registers data and Homebridge chracteristics update, now and then
								// regularly
								this._updateCharacteristicsValues();
								setInterval(this._updateCharacteristicsValues.bind(this), API_UPDATE_VALUES_DELAY);
								// Services methods and events handling
								// Set them in API callback so they do not trigger events while API provided infos are not yet retrieved
								this.stoveService.getCharacteristic(this.Characteristic.Active)
									.on("get", this.getStoveActive.bind(this))
									.on("set", this.setStoveActive.bind(this));
								this.stoveService.getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
									.on("get", this.getStoveState.bind(this));
								this.stoveService.getCharacteristic(this.Characteristic.CurrentTemperature)
									.on("get", this.getStoveCurrentTemp.bind(this));
								this.stoveService.getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
									.on("get", this.getStoveSetTemp.bind(this))
									.on("set", this.setStoveTemp.bind(this));
								this.stoveService.getCharacteristic(this.Characteristic.RotationSpeed)
									.on("get", this.getStovePower.bind(this))
									.on("set", this.setStovePower.bind(this));
							} else {
								this.log.error("init could not retrieve required stove info from API: " + err);
							}
						}); 
					} else {
						this.log.error("init could not login once with API: " + err);
					}
				});
			} else {
				this.log.error("init could not register app with API: " + err);
			}
		});
	}

	// API app registering helper
	_registerAPIApp(callback) {
		const url = this.apiRoot + API_APPSIGNUP;
		let postdata = {};
		postdata[POST_API_APPSIGNUP_KEY_TYPE] = POST_API_APPSIGNUP_VALUE_TYPE;
		postdata[POST_API_APPSIGNUP_KEY_ID] = this.apiPhoneUUID;
		postdata[POST_API_APPSIGNUP_KEY_VERSION] = PLUGIN_VERSION;
		postdata[POST_API_APPSIGNUP_KEY_LANG] = POST_API_APPSIGNUP_VALUE_LANG;
		postdata[POST_API_APPSIGNUP_KEY_IDAPP] = this.apiAppUUID;
		postdata[POST_API_APPSIGNUP_KEY_PUSHTOKEN] = this.apiPhoneUUID;
		postdata[POST_API_APPSIGNUP_KEY_PUSHACTIVE] = POST_API_APPSIGNUP_VALUE_PUSHACTIVE;
		fetch(url, {method: "POST", body: JSON.stringify(postdata), timeout: HTTP_TIMEOUT, headers: this.apiHTTPHeaders, redirect: "error"})
			.then( (resp) => {
				if (resp.ok) {
					this._debug("_registerAPIApp got a response with OK status");
					callback(null, true);
				} else {
					throw new Error("_registerAPIApp could not register an app to API (wrong brand in config), got status: " + resp.status);
				}
			})
			.catch( (err) => {
				this.log.error("_registerAPIApp HTTP request failed. Retrying... Reason: " + err.message);
				setTimeout(this._registerAPIApp.bind(this), HTTP_RETRY_DELAY, callback);
				//callback(err.message, null);
			});
	}

	// API login and auth auto-refresh helper
	_setAPILogin(refresh, callback) {
		if (!refresh) {
			this._debug("_setAPILogin attempting log-in");
		} else {
			this._debug("_setAPILogin refreshing authentication");
		}
		this.apiIsAuth = false;
		let url = this.apiRoot;
		if (!refresh) {
			// Specific case for Piazzetta
			// The user login has to be done at Piazzetta frontends mobile app server
			// with additional headers, but the response is a standard JWT token then and
			// can be used with Agua IOT API as before.
			if (API_ALIENS.includes(this.config.brand)) {
				url = MAP_SUPPORTED_BRANDS.get(this.config.brand)[2];
			} else {
				url += API_LOGIN;
			}
		} else {
			url += API_REFRESHTOKEN;
		}
		let loginheaders = {...this.apiHTTPHeaders};
		if (!refresh) {
			loginheaders[HTTP_REQ_LOCAL_HEADER] = true;
			loginheaders[HTTP_REQ_AUTH_HEADER] = this.apiAppUUID;
			// Specific case for Piazzetta
			if (API_ALIENS.includes(this.config.brand)) {
				loginheaders[HTTP_REQ_PIAZZETTA_URL] = API_LOGIN;
				loginheaders[HTTP_REQ_PIAZZETTA_APP_VERSION] = HTTP_REQ_PIAZZETTA_APP_VERSION_VALUE;
			}
		}
		let postdata = {};
		if (!refresh) {
			postdata[POST_API_LOGIN_KEY_LOGIN] = this.config.login;
			postdata[POST_API_LOGIN_KEY_PASSWORD] = this.config.password;
		} else {
			postdata[POST_API_REFRESHTOKEN_KEY_REFRESHTOKEN] = this.apiAuthRefreshToken;
		}
		fetch(url, {method: "POST", body: JSON.stringify(postdata), timeout: HTTP_TIMEOUT, headers: loginheaders, redirect: "error"})
			.then( (resp) => {
				if (resp.ok) {
					return resp.json();
				} else {
					throw new Error("_setAPILogin authentication rejected by API, got status: " + resp.status);
				}
			})
			.then( (jsonresp) => {
				this._debug("_setAPILogin got a OK response");
				let jwset = null;
				let jwref = null;
				if (jsonresp && (RESP_API_LOGIN_KEY_TOKEN in jsonresp)) {
					jwset = jwt.decode(jsonresp[RESP_API_LOGIN_KEY_TOKEN]);
					this._debug("_setAPILogin got JWT token decoded as: " + JSON.stringify(jwset));
					if (RESP_API_LOGIN_KEY_REFRESHTOKEN in jsonresp) {
						jwref = jwt.decode(jsonresp[RESP_API_LOGIN_KEY_REFRESHTOKEN]);
						this._debug("_setAPILogin got JWT refresh token decoded as: " + JSON.stringify(jwref));
					}
				}
				if (jwset) {
					this.apiAuthToken = jsonresp[RESP_API_LOGIN_KEY_TOKEN];
					this.apiIsAuth = true;
					if (jwref && !refresh) {
						this.apiAuthRefreshToken = jsonresp[RESP_API_LOGIN_KEY_REFRESHTOKEN];
						this.log.info("_setAPILogin successfully logged-in, setting auto-login refresh job every " + (API_AUTH_REFRESH_DELAY / 1000 / 60 / 60) + " h");
						if (this.jobAutoLogin !== null) {
							clearInterval(this.jobAutoLogin);
							this.jobAutoLogin = null;
						}
						this.jobAutoLogin = setInterval(this._setAPILogin.bind(this), API_AUTH_REFRESH_DELAY, true, (err, ok) => {
							if (err || !ok) {
								this._debug("_setAPILogin failed to auto-refresh token, rebooting to a regular auth: " + err);
								clearInterval(this.jobAutoLogin);
								this._setAPILogin(false, (err, ok) => {
									if (err || !ok) {
										this.log.error("_setAPILogin shitstorm (in autologin job failover): " + err);
									}
								});
							}
						});
					} else {
						this.log.info("_setAPILogin successfully refreshed authentication");
					}
					callback(null, true);
				} else {
					throw new Error("_setAPILogin did not get the expected JWT token back from API: " + JSON.stringify(jsonresp));
				}
			})
			.catch( (err) => {
				this.apiIsAuth = false;
				this.apiAuthToken = null;
				this.apiAuthRefreshToken = null;
				// Try forever on regular login
				if( !refresh ) {
					this.log.error("_setAPILogin HTTP login request failed. Retrying... Reason: " + err.message);
					setTimeout(this._setAPILogin.bind(this), HTTP_RETRY_DELAY, false, callback);
				} else {
					this._debug("_setAPILogin HTTP refresh request failed. Reason: " + err.message);
					callback(err.message, null);
				}
			});
	}

	// Send an authenticated request to API
	_sendAPIRequest(endpoint, httpmethod, postdata, callback) {
		if (this.apiIsAuth) {
			const url = this.apiRoot + endpoint;
			let requestheaders = {...this.apiHTTPHeaders};
			requestheaders[HTTP_REQ_LOCAL_HEADER] = false;
			requestheaders[HTTP_REQ_AUTH_HEADER] = this.apiAuthToken;
			this._debug("_sendAPIRequest " + httpmethod + " to: " + url + ", DATA = " + postdata);
			fetch(url, {method: httpmethod, body: postdata, timeout: HTTP_TIMEOUT, headers: requestheaders})
				.then( (resp) => {
					if (resp.ok) {
						this.counter += 1;
						return resp.json();
					} else if (resp.status === HTTP_STATUS_UNAUTH) {
						this.counter = 0;
						this.apiIsAuth = false;
						this._setAPILogin(false, (inerr, tokok) => {
							if (tokok && !inerr) {
								this._debug("_sendAPIRequest has renewed login because of 401 error");
							} else {
								this._debug("_sendAPIRequest could not renew login after a 401 error: " + inerr);
							}
						});
						throw new Error("_sendAPIRequest got 401 status, not logged-in or token expired");
					} else {
						throw new Error("_sendAPIRequest got non-OK non-401 HTTP response status: " + resp.status);
					}
				})
				.then( (jsonresp) => {
					this._debug("_sendAPIRequest got a response with OK status");
					callback(null, jsonresp);
				})
				.catch( (err) => {
					this.log.error("_sendAPIRequest HTTP request failed. Retrying... Reason: " + err.message);
					setTimeout(this._sendAPIRequest.bind(this), HTTP_RETRY_DELAY, endpoint, httpmethod, postdata, callback);
				});
		} else {
			callback("_sendAPIRequest could not send API request: not logged-in...", null);
		}
	}

	// Get a job result from API, or fail if max attempts reached
	_getAPIJobResult(jobid, attempt, callback) {
		if (this.apiStoveRegistersSet) {
			this._debug("_getAPIJobResult " + jobid + " attempt " + attempt + " start");
			if (attempt < API_DEVICEJOBSTATUS_MAX_RETRIES) {
				const url = API_DEVICEJOBSTATUS + "/" + jobid;
				this._sendAPIRequest(url, "GET", null, (err, json) => {
					if (json || !err) {
						if ((RESP_API_DEVICEJOBSTATUS_KEY_STATUS in json)) {
							this._debug("_getAPIJobResult " + jobid + " attempt " + attempt + " result: " + json[RESP_API_DEVICEJOBSTATUS_KEY_STATUS]);
							if (json[RESP_API_DEVICEJOBSTATUS_KEY_STATUS] === RESP_API_DEVICEJOBSTATUS_VALUE_STATUS_OK) {
								if (RESP_API_DEVICEJOBSTATUS_KEY_RESULT in json) {
									callback(null, json[RESP_API_DEVICEJOBSTATUS_KEY_RESULT]);
								} else {
									callback("_getAPIJobResult got job result without data: " + JSON.stringify(json), null);
								}
							} else if (json[RESP_API_DEVICEJOBSTATUS_KEY_STATUS] === RESP_API_DEVICEJOBSTATUS_VALUE_STATUS_NTD) {
								this._debug("_getAPIJobResult " + jobid + " finished successfully without returning data");
								callback(null, null);
							} else {
								this._debug("_getAPIJobResult " + jobid + " attempt " + attempt + " needs to schedule another attempt");
								setTimeout(this._getAPIJobResult.bind(this), API_DEVICEJOBSTATUS_DELAY_RETRY, jobid, attempt + 1, callback);
							}
						} else {
							callback("_getAPIJobResult did not get expected job result from API: " + JSON.stringify(json), null);
						}
					} else {
						callback("_getAPIJobResult API request failed: " + err, null);
					}
				});
			} else {
				callback("_getAPIJobResult did not complete in " + API_DEVICEJOBSTATUS_MAX_RETRIES + " requests", null);
			}
		} else {
			callback("_getAPIJobResult cannot query job result: stove registers map is not set", null);
		}
	}

	// Get the list of stove devices known for the config given account from API, and select first
	_getAPIStoveDevicesList(callback) {
		this._sendAPIRequest(API_DEVICESLIST, "POST", null, (err, json) => {
			if (json || !err) {
				if ((RESP_API_DEVICESLIST_KEY_DEVICES in json) && (json[RESP_API_DEVICESLIST_KEY_DEVICES].length > 0)) {
					let founddev = null;
					let errmess = null;
					for (const device of json[RESP_API_DEVICESLIST_KEY_DEVICES]) {
						this._debug("_getAPIStoveDevicesList checking device from API: " + JSON.stringify(device));
						if ((RESP_API_DEVICESLIST_KEY_DEVICE_ID in device) && (RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT in device) &&
							(RESP_API_DEVICESLIST_KEY_DEVICE_NAME in device)) {
							const devicename = device[RESP_API_DEVICESLIST_KEY_DEVICE_NAME];
							if (devicename === this.config.name) {
								founddev = true;
								this.apiStoveDeviceID = device[RESP_API_DEVICESLIST_KEY_DEVICE_ID];
								this.apiStoveDeviceProduct = device[RESP_API_DEVICESLIST_KEY_DEVICE_PRODUCT];
								this._debug("_getAPIStoveDevicesList found config device: " + devicename);
							}
						} else {
							errmess = "_getAPIStoveDevicesList did not get expected result for a device from API: " + JSON.stringify(device);
							break;
						}
					}
					if (!founddev) {
						errmess = "_getAPIStoveDevicesList did not find stove name in API - PLEASE FIX THIS PLUGIN CONFIG VALUE & RESTART: " + this.config.name;
					}
					callback(errmess, founddev);
				} else {
					callback("_getAPIStoveDevicesList did not get expected result from API: " + JSON.stringify(json), null);
				}
			} else {
				callback("_getAPIStoveDevicesList failed: " + err, null);
			}
		});
	}

	// Get the list of stove devices from API, select first one for further use, and get its registers map
	_getAPIStoveDevice(callback) {
		this._getAPIStoveDevicesList((err, founddev) => {
			if (founddev || !err) {
				this._getAPIStoveDeviceInfo((err, registersmapid) => {
					if (registersmapid || !err) {
						this._getAPIStoveRegistersMap(registersmapid, callback);
					} else {
						callback("_getAPIStoveDevice could not retrieve device registers map ID from API: " + err, null);
					}
				});
			} else {
				callback("_getAPIStoveDevice could not retrieve selected device (" + this.config.name + ") from API devices list: " + err, null);
			}
		});
	}

	// Get device info for previously retrieved device ID/product, from API
	_getAPIStoveDeviceInfo(callback) {
		let devicepostdata = {};
		devicepostdata[POST_API_DEVICEINFO_KEY_ID] = this.apiStoveDeviceID;
		devicepostdata[POST_API_DEVICEINFO_KEY_PRODUCT] = this.apiStoveDeviceProduct;
		this._sendAPIRequest(API_DEVICEINFO, "POST", JSON.stringify(devicepostdata), (err, json) => {
			if (json || !err) {
				if ((RESP_API_DEVICEINFO_KEY_INFO in json) && (json[RESP_API_DEVICEINFO_KEY_INFO].length > 0) && 
					(RESP_API_DEVICEINFO_KEY_REGISTERSMAP_ID in json[RESP_API_DEVICEINFO_KEY_INFO][0])) {
					this._debug("_getAPIStoveDeviceInfo got infos " + JSON.stringify(json));
					callback(null, json[RESP_API_DEVICEINFO_KEY_INFO][0][RESP_API_DEVICEINFO_KEY_REGISTERSMAP_ID]);
				} else {
					callback("_getAPIStoveDeviceInfo did not get expected result (map ID) from API: " + JSON.stringify(json), null);
				}
			} else {
				callback("_getAPIStoveDeviceInfo failed: " + err, null);
			}
		});
	}

	// Get device registers map for previously retrieved device ID/product and given registers map ID, from API
	_getAPIStoveRegistersMap(registersmapid, callback) {
		let regmappostdata = {};
		regmappostdata[POST_API_DEVICEREGISTERSMAP_KEY_ID] = this.apiStoveDeviceID;
		regmappostdata[POST_API_DEVICEREGISTERSMAP_KEY_PRODUCT] = this.apiStoveDeviceProduct;
		regmappostdata[POST_API_DEVICEREGISTERSMAP_KEY_LAST_UPDATE] = DATE_NEVER;
		this._sendAPIRequest(API_DEVICEREGISTERSMAP, "POST", JSON.stringify(regmappostdata), (err, json) => {
			if (json || !err) {
				if ((RESP_API_DEVICEREGISTERSMAP_KEY_L1 in json) && (RESP_API_DEVICEREGISTERSMAP_KEY_L2 in json[RESP_API_DEVICEREGISTERSMAP_KEY_L1])) {
					const registersmaps = json[RESP_API_DEVICEREGISTERSMAP_KEY_L1][RESP_API_DEVICEREGISTERSMAP_KEY_L2];
					this.apiStoveRegisters = {};
					let brokein = false;
					let errmess = null;
					for (const registersmap of registersmaps) {
						if (!brokein && (RESP_API_DEVICEREGISTERSMAP_KEY_ID in registersmap) && (RESP_API_DEVICEREGISTERSMAP_KEY_REGISTERS in registersmap)) {
							if (registersmap[RESP_API_DEVICEREGISTERSMAP_KEY_ID] === registersmapid) {
								for (const register of registersmap[RESP_API_DEVICEREGISTERSMAP_KEY_REGISTERS]) {
									if (!brokein && (REGISTER_KEY_ID in register) && (REGISTER_KEY_OFFSET in register)) {
										const regid = register[REGISTER_KEY_ID];
										const regoffset = register[REGISTER_KEY_OFFSET];
										this.apiStoveRegisters[regid] = {};
										this.apiStoveRegisters[regid][REGISTER_INTERNAL_KEY_VALUE] = null;
										if (this.apiStoveOffsetsRegistersMap && this.apiStoveOffsetsRegistersMap.has(regoffset)) {
											let sameoffsetregisters = this.apiStoveOffsetsRegistersMap.get(regoffset);
											sameoffsetregisters.push(regid);
											this.apiStoveOffsetsRegistersMap.set(regoffset, sameoffsetregisters);
										} else {
											this.apiStoveOffsetsRegistersMap.set(regoffset, [regid]);
										}
										for (const reqregisterkey of RESP_API_DEVICEREGISTERSMAP_REGISTER_KEYS) {
											if ((reqregisterkey in register)) {
												this.apiStoveRegisters[regid][reqregisterkey] = register[reqregisterkey];
											} else {
												errmess = "_getAPIStoveRegistersMap got an unexpected JSON register from API: " + JSON.stringify(register);
												brokein = true;
												break;
											}
										}
										// Get ON/OFF values according to value encoding tables of registers if any, as well as alarm error codes
										if (!brokein && (REGISTER_KEY_ENCVAL in register)) {
											for (const encval of register[REGISTER_KEY_ENCVAL]) {
												if ((REGISTER_ENCVAL_KEY_LANG in encval) && (REGISTER_ENCVAL_KEY_DESC in encval) &&
													encval[REGISTER_ENCVAL_KEY_LANG] === REGISTER_VALUE_ENCVAL_LANG) {
													if (encval[REGISTER_ENCVAL_KEY_DESC] === REGISTER_VALUE_ENCVAL_DESC_ON) {
														this.apiStoveRegisters[regid][REGISTER_INTERNAL_KEY_VALUEON] = encval[REGISTER_ENCVAL_KEY_VAL];
													} else if (encval[REGISTER_ENCVAL_KEY_DESC] === REGISTER_VALUE_ENCVAL_DESC_OFF) {
														this.apiStoveRegisters[regid][REGISTER_INTERNAL_KEY_VALUEOFF] = encval[REGISTER_ENCVAL_KEY_VAL];
													} else if (regid === STOVE_ALARM_REGISTER) {
														this.apiStoveAlarmsMap.set(encval[REGISTER_ENCVAL_KEY_VAL], encval[REGISTER_ENCVAL_KEY_DESC]);
													}
												}
											}
										}
									} else {
										if (!brokein) {
											errmess = "_getAPIStoveRegistersMap got an unexpected JSON register from API: " + JSON.stringify(register);
											brokein = true;
										}
										break;
									}
								}
							}
						} else {
							if (!brokein) {
								errmess = "_getAPIStoveRegistersMap got unexpected registers map JSON from API: " + Object.keys(registersmaps);
								brokein = true;
							}
							break;
						}
					}
					if (!brokein) {
						this.apiStoveRegistersSet = true;
						this._debug("_getAPIStoveRegistersMap retrieved registers map");
						for (const offnamecouple of this.apiStoveOffsetsRegistersMap.entries()) {
							this._debug(offnamecouple[0] + " => " + offnamecouple[1]);
						}
						callback(null, true);
					} else {
						callback(errmess, null);
					}
				} else {
					callback("_getAPIStoveRegistersMap did not get expected results from API: " + JSON.stringify(Object.keys(json)), null);
				}
			} else {
				callback("_getAPIStoveRegistersMap failed: " + err, null);
			}
		});
	}

	// Read required stove registers data from API
	_readAPIStoveRegisters(callback) {
		let readitems = [];
		let readmasks = [];
		function gsrCb(err, register) {
			if (register || !err) {
				readitems.push(register[REGISTER_KEY_OFFSET]);
				readmasks.push(register[REGISTER_KEY_MASK]);
			}
		}
		for (let registername of STOVE_READ_REGISTERS) {
			this._getStoveRegister(registername, gsrCb);
		}
		if (readitems.length === STOVE_READ_REGISTERS.length) {
			this._debug("_readAPIStoveRegisters asked to read");
			let regreadpostdata = {};
			regreadpostdata[POST_API_DEVICEREAD_KEY_ID] = this.apiStoveDeviceID;
			regreadpostdata[POST_API_DEVICEREAD_KEY_PRODUCT] = this.apiStoveDeviceProduct;
			regreadpostdata[POST_API_DEVICEREAD_KEY_PROTO] = POST_API_DEVICEREAD_VALUE_PROTO;
			regreadpostdata[POST_API_DEVICEREAD_KEY_BITDATA] = POST_API_DEVICEREAD_VALUE_BITDATA;
			regreadpostdata[POST_API_DEVICEREAD_KEY_ENDIANESS] = POST_API_DEVICEREAD_VALUE_ENDIANESS;
			regreadpostdata[POST_API_DEVICEREAD_KEY_FREQ] = POST_API_DEVICEREAD_VALUE_FREQ;
			regreadpostdata[POST_API_DEVICEREAD_KEY_ITEMS] = readitems;
			regreadpostdata[POST_API_DEVICEREAD_KEY_MASKS] = readmasks;
			this._sendAPIRequest(API_DEVICEREAD, "POST", JSON.stringify(regreadpostdata), (err, json) => {
				if (json || !err) {
					if ((RESP_API_DEVICEREAD_KEY_JOBID in json)) {
						this._waitForRegistersDataReadJobResult(json[RESP_API_DEVICEREAD_KEY_JOBID], (err, registersok) => {
							callback(err, registersok);
						});
					} else {
						callback("_readAPIStoveRegisters did not get expected result from API: " + JSON.stringify(json));
					}
				} else {
					callback("_readAPIStoveRegisters failed to request registers read with API: " + err, null);
				}
			});
		} else {
			callback("_readAPIStoveRegisters failed to get stove registers before trying to read them", null);
		}
	}

	// Write a stove register to API
	_writeAPIStoveRegister(registername, value, callback) {
		this._getStoveRegister(registername, (err, register) => {
			if (register || !err) {
				if (value >= register[REGISTER_KEY_MIN] && value <= register[REGISTER_KEY_MAX]) {
					const calcedval = this._calculateStoveValue(register, false, true, value);
					if (calcedval) {
						this._debug("_writeAPIStoveRegister asked to write " + registername + "=" + value + " => " + register[REGISTER_KEY_OFFSET] + "=" + calcedval);
						let regwritepostdata = {};
						regwritepostdata[POST_API_DEVICEWRITE_KEY_ID] = this.apiStoveDeviceID;
						regwritepostdata[POST_API_DEVICEWRITE_KEY_PRODUCT] = this.apiStoveDeviceProduct;
						regwritepostdata[POST_API_DEVICEWRITE_KEY_PROTO] = POST_API_DEVICEWRITE_VALUE_PROTO;
						regwritepostdata[POST_API_DEVICEWRITE_KEY_BITDATA] = POST_API_DEVICEWRITE_VALUE_BITDATA;
						regwritepostdata[POST_API_DEVICEWRITE_KEY_ENDIANESS] = POST_API_DEVICEWRITE_VALUE_ENDIANESS;
						regwritepostdata[POST_API_DEVICEWRITE_KEY_ITEMS] = [register[REGISTER_KEY_OFFSET]];
						regwritepostdata[POST_API_DEVICEWRITE_KEY_MASKS] = [register[REGISTER_KEY_MASK]];
						regwritepostdata[POST_API_DEVICEWRITE_KEY_VALUES] = [calcedval];
						this._sendAPIRequest(API_DEVICEWRITE, "POST", JSON.stringify(regwritepostdata), (err, json) => {
							if (json || !err) {
								if ((RESP_API_DEVICEWRITE_KEY_JOBID in json)) {
									this._getAPIJobResult(json[RESP_API_DEVICEWRITE_KEY_JOBID], 0, (err, res) => {
										if (res || !err) {
											if (RESP_API_DEVICEJOBSTATUS_RESULT_WRITE_KEY_ERRCODE in res) {
												callback("_writeAPIStoveRegister API job returned an error: " + res[RESP_API_DEVICEJOBSTATUS_RESULT_WRITE_KEY_ERRCODE], null);
											} else {
												register[REGISTER_INTERNAL_KEY_VALUE] = calcedval;
												this._debug("_writeAPIStoveRegister wrote registers in API");
												callback(null, true);
											}
										} else {
											callback("_writeAPIStoveRegister API job failed: " + err, null);
										}
									});
								} else {
									callback("_writeAPIStoveRegister did not get expected result from API: " + JSON.stringify(json));
								}
							} else {
								callback("_writeAPIStoveRegister failed to request registers write with API: " + err, null);
							}
						});
					} else {
						callback("_writeAPIStoveRegister could not calculate register value for: " + registername, null);
					}
				} else {
					callback("_writeAPIStoveRegister wanted to write an out ot bound value for " + registername + ": " + value, null);
				}
			} else {
				callback("_writeAPIStoveRegister failed to get stove register before trying to write it: " + err, null);
			}
		});
	}

	// Wait for read registers data job results, and parse it when done
	_waitForRegistersDataReadJobResult(jobid, callback) {
		this._debug("_waitForRegistersDataReadJobResult called for job " + jobid);
		this._getAPIJobResult(jobid, 0, (err, res) => {
			if ((res === null) && (err === null)) {
				this._debug("_waitForRegistersDataReadJobResult got nothing to update");
				callback(null, false);
			} else if (res || !err) {
				if( (RESP_API_DEVICEJOBSTATUS_RESULT_KEY_ITEMS in res) && (RESP_API_DEVICEJOBSTATUS_RESULT_KEY_VALUES in res)) {
					this.lastStoveRegistersUpdate = Date.now();
					let itemindex = 0;
					for (const offset of res[RESP_API_DEVICEJOBSTATUS_RESULT_KEY_ITEMS]) {
						if ((res[RESP_API_DEVICEJOBSTATUS_RESULT_KEY_VALUES].length > itemindex) && this.apiStoveOffsetsRegistersMap.has(offset)) {
							for (const registername of this.apiStoveOffsetsRegistersMap.get(offset)) {
								this.apiStoveRegisters[registername][REGISTER_INTERNAL_KEY_VALUE] = res[RESP_API_DEVICEJOBSTATUS_RESULT_KEY_VALUES][itemindex];
								this._debug("_waitForRegistersDataReadJobResult setting raw value: " + registername + "(" + offset + ")=" + this.apiStoveRegisters[registername][REGISTER_INTERNAL_KEY_VALUE]);
							}
							itemindex++;
						} else {
							this.log.warn("_waitForRegistersDataReadJobResult got unknown register offset, or offset without value: " + offset);
						}
					}
					if (STOVE_ALARM_REGISTER in this.apiStoveRegisters) {
						const alarmval = this.apiStoveRegisters[STOVE_ALARM_REGISTER][REGISTER_INTERNAL_KEY_VALUE];
						if (!STOVE_ALARM_IGNORE_VALUES.includes(alarmval) && this.apiStoveAlarmsMap.has(alarmval)) {
							this.log.warn("Stove alarm seems to be set: " + this.apiStoveAlarmsMap.get(alarmval));
						}
					}
					this._debug("_waitForRegistersDataReadJobResult updated stove registers from API");
					callback(null, true);
				} else {
					this.log.error("_waitForRegistersDataReadJobResult did not get expected result from API: " + JSON.stringify(res));
				}
			} else {
				callback("_waitForRegistersDataReadJobResult API job failed: " + err, null);
			}
		});
	}

	// Update registers data cache from API values if necessary
	_updateAPIRegistersData(callback) {
		this._debug("_updateAPIRegistersData called, apiStoveRegistersSet=" + this.apiStoveRegistersSet + ", apiPendingReadJob=" + this.apiPendingReadJob);
		if (this.apiStoveRegistersSet) {
			// If an API read job is already pending, or cache did not expire, do nothing
			if (this.apiPendingReadJob) {
				this._debug("_updateAPIRegistersData will do nothing, a job is pending: " + this.apiPendingReadJob);
				callback(null, false);
			} else if ((this.lastStoveRegistersUpdate + STOVE_REGISTERS_CACHE_KEEP) >= Date.now()) {
				this._debug("_updateAPIRegistersData will do nothing, cache is up to date");
				callback(null, false);
			// Otherwise, schedule a real API data read job to fill the cache
			} else {
				// This var is doing the magic on knowing if a read job is already scheduled
				this.apiPendingReadJob = true;
				this._readAPIStoveRegisters((err, registersok) => {
					this.apiPendingReadJob = false;
					callback(err, registersok);
				});
			}
		} else {
			callback("_updateAPIRegistersData cannot set registers: registers map not set yet", null);
		}
	}

	// Get a single register structure
	_getStoveRegister(registername, callback) {
		if (this.apiStoveRegistersSet) {
			if (registername in this.apiStoveRegisters) {
				const register = this.apiStoveRegisters[registername];
				this._debug("_getStoveRegister " + registername + ": " + JSON.stringify(register));
				callback(null, register);
			} else {
				callback("_getStoveRegister register name not in registers: " + registername, null);
			}
		} else {
			callback("_getStoveRegister cannot get a register: map not set yet", null);
		}
	}

	// Calculate human value from register value, or the opposite
	_calculateStoveValue(register, tostring, reverse, inputvalue) {
		let result = null;
		let rawval = null;
		if (reverse || (inputvalue !== null)) {
			rawval = inputvalue;
		} else {
			rawval = register[REGISTER_INTERNAL_KEY_VALUE];
		}
		if (rawval !== null) {
			let formula = null;
			if (reverse) {
				formula = register[REGISTER_KEY_FORMULAREV];
			} else {
				formula = register[REGISTER_KEY_FORMULA];
			}
			if (formula === REGISTER_VALUE_FORMULA_VALPH) {
				result = rawval;
			} else {
				formula = formula.replace(REGISTER_VALUE_FORMULA_VALPH, rawval);
				// This is insanely dangerous, but it seems it is designed to be done
				// with such things like eval.
				// Using a REGEX to try to limit malicious opportunities.
				if (formula.match(REGISTER_VALUE_FORMULA_REGEX)) {
					// jshint -W061
					let calcedval = eval(formula);
					// jshint +W061
					if (!reverse && tostring && (REGISTER_KEY_FORMAT in register) && register[REGISTER_KEY_FORMAT].contains(REGISTER_VALUE_STRING_VALPH)) {
						calcedval = register[REGISTER_KEY_FORMAT].replace(REGISTER_VALUE_STRING_VALPH, calcedval);
					}
					result = calcedval;
				} else {
					this.log.error("_calculateStoveValue refusing to eval, because of dangerous register value calculation: " + formula, null);
				}
			}
		}
		return result;
	}

	// Get a register min and max boundaries as [min, max] array
	_getStoveRegisterBoundaries(registername, callback) {
		this._getStoveRegister(registername, (err, register) => {
			if (register || !err) {
					if ( (REGISTER_KEY_MIN in register) && (REGISTER_KEY_MAX in register) ) {
						const bmin = register[REGISTER_KEY_MIN];
						const bmax = register[REGISTER_KEY_MAX];
						const bstep = register[REGISTER_KEY_STEP];
						this._debug("_getStoveRegisterBoundaries " + registername + " => [" + bmin + ", " + bmax + "] step " + bstep);
						callback(null, [bmin, bmax, bstep]);
					} else {
						callback("_getStoveRegisterBoundaries could not get boundaries from register for: " + registername, null);
					}
			} else {
				callback("_getStoveRegisterBoundaries failed: " + err, null);
			}
		});
	}

	// Get a unique register value, forced from cache
	_getStoveRegisterValueFromCache(registername, tostring, callback) {
		if (this.lastStoveRegistersUpdate) {
			this._getStoveRegister(registername, (err, register) => {
				const calcedval = this._calculateStoveValue(register, false, false, null);
				if (calcedval !== null) {
					this._debug("_getStoveRegisterValueFromCache " + registername + " => " + calcedval);
					callback(null, calcedval);
				} else {
					callback("_getStoveRegisterValueFromCache could not calculate value from register for: " + registername, null);
				}
			});
		} else {
			callback("_getStoveRegisterValueFromCache " + registername + ": not possible, cache empty", null);
		}
	}

	// Determine stove status based on register data
	_calculateStoveStatus(value, state) {
		const index = (state) ? (1) : (0);
		let statePair = this.defaultStatePair;
		if (this.stateMap.has(value)) {
			statePair = this.stateMap.get(value);
		} else {
			this.log.error("_calculateStoveStatus (" + state + ") doesn't know which state is value: " + value);
		}
		return statePair[index];
	}

	// Update Homebridge device characteristics values
	_updateCharacteristicsValues() {
		this._updateAPIRegistersData((err, ok) => {
			if (ok) {
				this._getStoveRegisterValueFromCache(STOVE_STATE_REGISTER, false, (err, value) => {
					if ((value !== null) || !err) {
						const active = this._calculateStoveStatus(value, false);
						this.stoveService.updateCharacteristic(this.Characteristic.Active, active);
						this._debug("_updateCharacteristicsValues Active: " + value + " => " + active + " (ERR: " + err + ")");
						const status = this._calculateStoveStatus(value, true);
						this.stoveService.updateCharacteristic(this.Characteristic.CurrentHeaterCoolerState, status);
						this._debug("_updateCharacteristicsValues CurrentHeaterCoolerState: " + value + " => " + active + " (ERR: " + err + ")");
					} else {
						this.log.error("_updateCharacteristicsValues failed from " + STOVE_STATE_REGISTER + ": " + err);
					}
				});
				this._getStoveRegisterValueFromCache(STOVE_CURRENT_TEMP_REGISTER, false, (err, value) => {
					if ((value !== null) || !err) {
						this.stoveService.updateCharacteristic(this.Characteristic.CurrentTemperature, value);
						this._debug("_updateCharacteristicsValues CurrentTemperature: " + value + " (ERR: " + err + ")");
					} else {
						this.log.error("_updateCharacteristicsValues failed from " + STOVE_CURRENT_TEMP_REGISTER + ": " + err);
					}
				});
				this._getStoveRegisterValueFromCache(STOVE_SET_TEMP_REGISTER, false, (err, value) => {
					if ((value !== null) || !err) {
						this.stoveService.updateCharacteristic(this.Characteristic.HeatingThresholdTemperature, value);
						this._debug("_updateCharacteristicsValues HeatingThresholdTemperature: " + value + " (ERR: " + err + ")");
					} else {
						this.log.error("_updateCharacteristicsValues failed from " + STOVE_SET_TEMP_REGISTER + ": " + err);
					}
				});
				this._getStoveRegisterValueFromCache(STOVE_CURRENT_POWER_REGISTER, false, (err, value) => {
					if ((value !== null) || !err) {
						this.stoveService.updateCharacteristic(this.Characteristic.RotationSpeed, value);
						this._debug("_updateCharacteristicsValues RotationSpeed: " + value + " (ERR: " + err + ")");
					} else {
						this.log.error("_updateCharacteristicsValues failed from " + STOVE_CURRENT_POWER_REGISTER + ": " + err);
					}
				});
			} else if ((ok === false) && (err === null)) {
				this._debug("_updateCharacteristicsValues did nothing (cache OK, job pending or no data change from API)");
			} else {
				this.log.error("_updateCharacteristicsValues failed: " + err);
			}
		});
	}

	// Get stove status (active or state)
	_getStoveStatus(state, callback) {
		let active = this.stoveCharDefaultActive;
		if (state) {
			active = this.stoveCharDefaultState;
		}
		this._getStoveRegisterValueFromCache(STOVE_STATE_REGISTER, false, (err, value) => {
			if (value !== null) {
				active = this._calculateStoveStatus(value, state);
			}
			callback(err, active);
		});
		this._updateCharacteristicsValues();
	}

	// Generic getter wrapper
	_getterWrapper(registername, defaultvalue, callback) {
		this._getStoveRegisterValueFromCache(registername, false, (err, value) => {
			let appliedval = defaultvalue;
			if (value === null) {
				this._debug("_getterWrapper got null value, ERR: " + err);
			} else {
				appliedval = value;
			}
			callback(null, appliedval);
		});
		this._updateCharacteristicsValues();
	}

	/* ACTUAL GETTER/SETTERS for HomeBridge Interface
	* As the API submit job/query job result design and responsiveness is too slow
	* for HomeBridge/HomeKit to feel well with, the GETTERS strategy complies with the
	* following description in order to better global responsiveness:
	* - Registers data are obtained once first during plugin init, to ensure an internal
	*   cache is filled, then regularly every hour.
	* - Each HomeKit request is responded immediately by querying register value from 
	*   cache, whatever old it is (1h max), so a response is given as fast as 
	*   possible, and Homebridge/HomeKit do not hang.
	* - A real data update from API is then done, this time by checking how old is cache.
	*   If cache is old, the registers data will be updated from API. At the end of the
	*   update, the Homebridge characteristic is updated with most up to date value. If
	*   it changed from the first answer, Homebridge will trigger an
	*   asynchronous update of it (just as when characteristics are set).
	*/

	// Get ON/OFF state
	getStoveActive(callback) {
		this._getStoveStatus(false, callback);
	}

	// Get running state (more precise than ON/OFF)
	getStoveState(callback) {
		this._getStoveStatus(true, callback);
	}

	// Get stove measured air temp
	getStoveCurrentTemp(callback) {
		this._getterWrapper(STOVE_CURRENT_TEMP_REGISTER, this.stoveCharDefaultTemp, callback);
	}

	// Get threshold temperature from which to power on heating
	getStoveSetTemp(callback) {
		this._getterWrapper(STOVE_SET_TEMP_REGISTER, this.stoveCharDefaultSetTemp, callback);
	}

	// Get stove current running power
	getStovePower(callback) {
		this._getterWrapper(STOVE_CURRENT_POWER_REGISTER, this.stoveCharDefaultPower, callback);
	}

	// Set ON/OFF
	setStoveActive(state, callback) {
		let registername = STOVE_POWER_STATE_SET_ON_REGISTER;
		let targetvaluekey = REGISTER_INTERNAL_KEY_VALUEON;
		if (state == this.Characteristic.Active.INACTIVE) {
			registername = STOVE_POWER_STATE_SET_OFF_REGISTER;
			targetvaluekey = REGISTER_INTERNAL_KEY_VALUEOFF;
		}
		const dn = Date.now();
		this._getStoveRegister(STOVE_POWER_STATE_INFO_REGISTER, (err, inforegister) => {
			let calcerr = err;
			if (inforegister || !err) {
				const targetvalue = inforegister[targetvaluekey];
				const currentvalue = inforegister[REGISTER_INTERNAL_KEY_VALUE];
				this._getStoveRegisterValueFromCache(STOVE_STATE_REGISTER, false, (err, stateregisterval) => {
					if (stateregisterval || !err) {
						const currentstate = this._calculateStoveStatus(stateregisterval, false);
						if (currentstate === null) {
							calcerr = "setStoveActive could not calculate stove power state: " + registername;
							this.log.error(calcerr);
						} else if (currentstate === state) {
							calcerr = null;
							this._debug("setStoveActive will not change state as stove already at target state: " + currentstate + " == " + state);
						} else if (targetvalue === currentvalue) {
							calcerr = null;
							this._debug("setStoveActive will not change state as stove register value already identical: " + targetvalue + " == " + currentvalue);
						} else if ( (dn - this.lastStovePowerChange) <= POWER_SWING_PROTECTION_DELAY ) {
							calcerr = "setStoveActive stopped by power swing protection: last power change is too close in time (next power state change possible at " + new Date(this.lastStovePowerChange + POWER_SWING_PROTECTION_DELAY) + ")";
							this.log.warn(calcerr);
						} else {
							this._writeAPIStoveRegister(registername, targetvalue, (err, ok) => {
								if (ok || !err) {
									this.stoveService.updateCharacteristic(this.Characteristic.Active, state);
									this.lastStovePowerChange = dn;
									this.log.info("setStoveActive set stove to power " + state);
									calcerr = null;
								} else {
									calcerr = "setStoveActive failed: " + err;
									this.log.error(calcerr);
								}
							});
						}
					} else {
						calcerr = "setStoveActive could not get current power state: " + err;
						this.log.error(calcerr);
					}
				});
			} else {
				calcerr = "setStoveActive could not get power state management info register: " + err;
				this.log.error(calcerr);
			}
			callback(calcerr);
		});
	}

	// Set threshold temperature from which to power on heating
	setStoveTemp(temp, callback) {
		this._writeAPIStoveRegister(STOVE_SET_TEMP_REGISTER, temp, (err, ok) => {
			if (ok || !err) {
				this.stoveService.updateCharacteristic(this.Characteristic.HeatingThresholdTemperature, temp);
				this.log.info("setStoveTemp set stove heating temp to " + temp);
			} else {
				this.log.error("setStoveTemp failed: " + err);
			}
			callback(err);
		});
	}

	// Set stove running power
	setStovePower(power, callback) {
		this._writeAPIStoveRegister(STOVE_SET_POWER_REGISTER, power, (err, ok) => {
			if (ok || !err) {
				this.stoveService.updateCharacteristic(this.Characteristic.RotationSpeed, power);
				this.log.info("setStovePower set stove power to " + power);
			} else {
				this.log.error("setStovePower failed: " + err);
			}
			callback(err);
		});
	}
}

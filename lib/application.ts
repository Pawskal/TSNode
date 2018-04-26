import express from 'express';
import Router from 'express';
import bodyParser from 'body-parser';
import { Injector } from './injector';
import { IController, IAuthOptions, Type } from './interfaces';

// import secret from '../example/secret';
// import jwt from 'jsonwebtoken';

class AuthOptions implements IAuthOptions {
  public strategy: string;
  constructor(){
    this.strategy = 'jwt';
  }
}

export class ConfigProvider {
  constructor(config) {
    Object.assign(this, config);
  }
}

class Application {

  private static _instance: Application;
  
  public get Injector(): Injector {
    return this._injector
  }

  private _injector: Injector;

  private express: any;

  private authorizationProvider : any;

  private authorizationControllers: any = [];

  private enableAthorization: boolean = false;

  private authorizationOptions: AuthOptions;

  private dbProvider: any;

  private configProvider: ConfigProvider;

  private controllers: Map<string, IController>;
  
  constructor() {
    this.express = express();
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
    this._injector = Injector.getInstance();

    this.controllers = this._injector.controllers;

    this._injector.setInstance(this);

    return Application._instance || (Application._instance = this);
  }

  public registerModule(modul): void {
    Object.keys(modul).forEach((m) => console.log(m, 'registered'))
  }

  private authMiddleware(req, res, next) : void {
    if(this.enableAthorization) {
      
      // const token = req.headers[this.authorizationOptions.header];
      // // const decoded = jwt.verify(token,secret);
      // // const verifyResult = this.authorizationProvider.verify(decoded);
      
      // if(verifyResult.verify){
      //   req.data = verifyResult.data;
      //   next();
      // }
      // else{
      //   res.sendStatus(401);
      // }
    } else {
      next();
    }
  }

  public useAuthorizationProvider<T>(provider: Type<T>, cb: Function) {
    this.enableAthorization = true;
    this._injector.set(provider);
    this.authorizationProvider = this._injector.resolve<any>(provider.name);
    this.authorizationOptions = new AuthOptions();
    cb(this.authorizationOptions);    
  }

  public async useDBProvider<T>(provider: Type<T>) {
    this._injector.set(provider);
    this.dbProvider = this._injector.resolve<any>(provider.name);
  }

  public useConfig(cb) {
    const config = {}
    cb(config);
    this._injector.setInstance(new ConfigProvider(config));
  }

  private buildController(definition: IController, name) {
    definition.instance = Application._instance.Injector.resolve<any>(name);
    definition.routes.forEach((routes, path) => {
      Object.keys(routes).forEach((method) => {
        async function handler(req, res, next) {
          const stub = () => console.log('stub');

          const before = routes[method]['before'] || stub;
          const origin = routes[method]['origin'].handler || stub; 
          const after = routes[method]['after'] || stub; 

          await before.apply(definition.instance, arguments)

          req.result = await origin.apply(definition.instance, arguments)

          await after.apply(definition.instance, arguments)
          res.send(req.result)
        }

        console.log(`/${definition.basePath}/${path}`, 'registered')

        let authRequired = routes[method].auth === false ? false : definition.auth;

        const authMiddleware = authRequired ? this.authMiddleware.bind(this) : function () { arguments[2].call() };

        this.express.use(`/${definition.basePath}`, authMiddleware, Router()[method](`/${path}`, handler))
      })
    })
  }

  public start(cb: Function) {
    this.controllers.forEach(this.buildController.bind(this));
    cb(this.express);
  }
}

export default Application;
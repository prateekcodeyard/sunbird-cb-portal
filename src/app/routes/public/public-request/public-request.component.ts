import { Component, OnInit } from '@angular/core'
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { MatDialog, MatSnackBar } from '@angular/material'
import { environment } from 'src/environments/environment'
// tslint:disable-next-line: import-name
import _ from 'lodash'
import { Subscription, Observable, interval } from 'rxjs'
import { map } from 'rxjs/operators'
import { SignupService } from '../public-signup/signup.service'
import { RequestService } from './request.service'
import { RequestSuccessDialogComponent } from './request-success-dialog/request-success-dialog.component'

export function forbiddenNamesValidatorPosition(optionsArray: any): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!optionsArray) {
      return null
      // tslint:disable-next-line: no-else-after-return
    } else {
      const index = optionsArray.findIndex((op: any) => {
        // tslint:disable-next-line: prefer-template
        // return new RegExp('^' + op.channel + '$').test(control.channel)
        return op.name === control.value.name
      })
      return index < 0 ? { forbiddenNames: { value: control.value.name } } : null
    }
  }
}

@Component({
  selector: 'ws-public-request',
  templateUrl: './public-request.component.html',
  styleUrls: ['./public-request.component.scss'],
})
export class PublicRequestComponent implements OnInit {
  requestForm!: FormGroup
  namePatern = `[a-zA-Z\\s\\']{1,32}$`
  emailWhitelistPattern = `^[a-zA-Z0-9._-]{3,}\\b@\\b[a-zA-Z0-9]*|\\b(.gov|.nic)\b\\.\\b(in)\\b$`
  phoneNumberPattern = '^((\\+91-?)|0)?[0-9]{10}$'
  confirm = false
  disableBtn = false
  isMobileVerified = false
  otpSend = false
  otpVerified = false
  requestType: any
  masterPositions!: Observable<any> | undefined
  emailLengthVal = false
  OTP_TIMER = environment.resendOTPTIme
  timerSubscription: Subscription | null = null
  timeLeftforOTP = 0
  // tslint:disable-next-line:max-line-length
  requestObj: {
    state: string
    action: string
    serviceName: string
    userId: string
    applicationId: string;
    actorUserId: string
    deptName: string
    updateFieldValues: { name: string; description: string; userId: string} []}  | undefined

  constructor(private activatedRoute: ActivatedRoute,
              private snackBar: MatSnackBar,
              private signupSvc: SignupService,
              private dialog: MatDialog,
              private requestSvc: RequestService) {
    this.requestType = this.activatedRoute.snapshot.queryParams.type
    this.requestForm = new FormGroup({
      firstname: new FormControl('', [Validators.required, Validators.pattern(this.namePatern)]),
      email: new FormControl('', [Validators.required, Validators.pattern(this.emailWhitelistPattern)]),
      mobile: new FormControl('', [Validators.required, Validators.pattern(this.phoneNumberPattern)]),
      // tslint:disable-next-line:max-line-length
      position: new FormControl('', this.requestType === 'Position' ? [Validators.required, forbiddenNamesValidatorPosition(this.masterPositions)] : []),
      organisation: new FormControl('', this.requestType === 'Organisation' ? Validators.required : []),
      addDetails: new FormControl('', []),
      confirmBox: new FormControl(false, [Validators.required]),
    })
   }

  ngOnInit() {

  }

  emailVerification(emailId: string) {
    this.emailLengthVal = false
    if (emailId && emailId.length > 0) {
      const email = emailId.split('@')
      if (email && email.length === 2) {
        if ((email[0] && email[0].length > 64) || (email[1] && email[1].length > 255)) {
          this.emailLengthVal = true
        }
      } else {
        this.emailLengthVal = false
      }
    }
  }

  sendOtp() {
    const mob = this.requestForm.get('mobile')
    if (mob && mob.value && Math.floor(mob.value) && mob.valid) {
      this.signupSvc.sendOtp(mob.value).subscribe(() => {
        this.otpSend = true
        alert('OTP send to your Mobile Number')
        this.startCountDown()
        // tslint:disable-next-line: align
      }, (error: any) => {
        this.snackBar.open(_.get(error, 'error.params.errmsg') || 'Please try again later')
      })
    } else {
      this.snackBar.open('Please enter a valid Mobile No')
    }
  }
  resendOTP() {
    const mob = this.requestForm.get('mobile')
    if (mob && mob.value && Math.floor(mob.value) && mob.valid) {
      this.signupSvc.resendOtp(mob.value).subscribe((res: any) => {
        if ((_.get(res, 'result.response')).toUpperCase() === 'SUCCESS') {
          this.otpSend = true
          alert('OTP send to your Mobile Number')
          this.startCountDown()
        }
        // tslint:disable-next-line: align
      }, (error: any) => {
        this.snackBar.open(_.get(error, 'error.params.errmsg') || 'Please try again later')
      })
    } else {
      this.snackBar.open('Please enter a valid Mobile No')
    }
  }

  verifyOtp(otp: any) {
    // console.log(otp)
    const mob = this.requestForm.get('mobile')
    if (otp && otp.value) {
      if (mob && mob.value && Math.floor(mob.value) && mob.valid) {
        this.signupSvc.verifyOTP(otp.value, mob.value).subscribe((res: any) => {
          if ((_.get(res, 'result.response')).toUpperCase() === 'SUCCESS') {
            this.otpVerified = true
            this.isMobileVerified = true
            this.disableBtn = false
          }
          // tslint:disable-next-line: align
        }, (error: any) => {
          this.snackBar.open(_.get(error, 'error.params.errmsg') || 'Please try again later')
        })
      }
    }
  }

  startCountDown() {
    const startTime = Date.now()
    this.timeLeftforOTP = this.OTP_TIMER
    // && this.primaryCategory !== this.ePrimaryCategory.PRACTICE_RESOURCE
    if (this.OTP_TIMER > 0
    ) {
      this.timerSubscription = interval(1000)
        .pipe(
          map(
            () =>
              startTime + this.OTP_TIMER - Date.now(),
          ),
        )
        .subscribe(_timeRemaining => {
          this.timeLeftforOTP -= 1
          if (this.timeLeftforOTP < 0) {
            this.timeLeftforOTP = 0
            if (this.timerSubscription) {
              this.timerSubscription.unsubscribe()
            }
          }
        })
    }
  }

  public confirmChange() {
    this.confirm = !this.confirm
    this.requestForm.patchValue({
      confirmBox: this.confirm,
    })
  }

  submitRequest() {
    // tslint:disable-next-line:no-console
    console.log('this.requestForm', this.requestForm.value)
    this.requestObj = {
      state: 'INITIATE',
      action: 'INITIATE',
      serviceName: '',
      userId: 'manas53',
      applicationId: '1234',
      actorUserId: '1237',
      deptName : 'CS',
      updateFieldValues: [],
    }

    if (this.requestType === 'Position') {
      this.requestObj.serviceName = 'position'

      const formobj = {
        name: this.requestForm.value.position,
        description: this.requestForm.value.addDetails,
        userId : this.requestForm.value.firstname,
      }
      this.requestObj.updateFieldValues.push(formobj)

      // tslint:disable-next-line:no-console
      console.log('Pos create', this.requestObj)
      // this.openDialog(this.requestType)

      this.requestSvc.createPosition(this.requestObj).subscribe(
        (_res: any) => {
          this.openDialog(this.requestType)
          this.disableBtn = false
          this.isMobileVerified = true
        },
        (err: any) => {
          this.disableBtn = false
          // this.loggerSvc.error('Error in registering new user >', err)
          if (err.error && err.error.params && err.error.params.errmsg) {
            this.openSnackbar(err.error.params.errmsg)
          } else {
            this.openSnackbar('Something went wrong, please try again later!')
          }
        }
      )

    } else if (this.requestType === 'Organisation') {
      this.requestObj.serviceName = 'organisation'

      const formobj = {
        name: this.requestForm.value.organisation,
        description: this.requestForm.value.addDetails,
        userId : this.requestForm.value.firstname,
      }
      this.requestObj.updateFieldValues.push(formobj)

      // tslint:disable-next-line:no-console
      console.log('Org create', this.requestObj)
      // this.openDialog(this.requestType)

      this.requestSvc.createOrg(this.requestObj).subscribe(
        (_res: any) => {
          this.openDialog(this.requestType)
          this.disableBtn = false
          this.isMobileVerified = true
        },
        (err: any) => {
          this.disableBtn = false
          // this.loggerSvc.error('Error in registering new user >', err)
          if (err.error && err.error.params && err.error.params.errmsg) {
            this.openSnackbar(err.error.params.errmsg)
          } else {
            this.openSnackbar('Something went wrong, please try again later!')
          }
        }
      )

    }
  }

  openDialog(type: any): void {
    const dialogRef = this.dialog.open(RequestSuccessDialogComponent, {
      // height: '400px',
      width: '500px',
      data:  { requestType: type },
      // data: { content, userId: this.userId, userRating: this.userRating },
    })
    dialogRef.afterClosed().subscribe((_result: any) => {
    })
  }

  private openSnackbar(primaryMsg: string, duration: number = 5000) {
    this.snackBar.open(primaryMsg, 'X', {
      duration,
    })
  }

}
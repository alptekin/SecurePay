﻿import { Box, Button, Paper, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import AddressForm from "./AddressForm";
import PaymentForm from "./PaymentForm";
import Review from "./Review";
import { yupResolver } from '@hookform/resolvers/yup';
import { validationSchema } from "./checkoutValidation";
import agent from "../../app/api/agent";
import { useAppDispatch, useAppSelector } from "../../app/store/configureStore";
import { clearBasket } from "../basket/basketSlice";
import { LoadingButton } from "@mui/lab";
import { CardNumberElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { StripeElementType } from "@stripe/stripe-js";

const steps = ['Gönderim adresi', 'Siparişinizi inceleyin', 'Ödeme ayrıntıları'];



export default function CheckoutPage() {

    const [activeStep, setActiveStep] = useState(0);
    const [orderNumber, setOrderNumber] = useState(0);
    const [loading, setLoading] = useState(false);
    const dispatch = useAppDispatch();


    const [cardState, setCardState] = useState<{ elementError: { [key in StripeElementType]?: string } }>({ elementError: {} }); 
    const [cardComplete,setCardComplete]=useState<any>({cardNumber:false,cardExpiry:false,cardCvc:false});
    const [paymentMessage,setPaymentMessage] =useState('');
    const [paymentSucceeded,setPaymentSucceeded] =useState(false);
    const {basket} =useAppSelector(state=>state.basket);
    const stripe = useStripe();
    const elements=useElements(); 
   
    function onCardInputChange(event:any){
        setCardState({
            ...cardState,
            elementError:{
                ...cardState.elementError,
                [event.elementType]:event.error?.message
            }
        })

        setCardComplete({...cardComplete,[event.elementType]:event.complete})
    }
    function getStepContent(step: number) {
        switch (step) {
            case 0:
                return <AddressForm />;
            case 1:
                return <Review />;
            case 2:
                return <PaymentForm cardState={cardState} onCardInputChange={onCardInputChange} />;
            default:
                throw new Error('Bilinmeyen Hata!...');
        }
    }

    const currentValidationSchema = validationSchema[activeStep];

    const methods = useForm({
        mode: 'onTouched',
        resolver: yupResolver(currentValidationSchema)
    });

    useEffect(() => {
        agent.Account.fetchAddres()
            .then(response => {
                if (response) {
                    methods.reset({ ...methods.getValues(),...response,saveAddress:false})
                }
            })
    },[methods]);

    async function sumbitOrder(data:FieldValues) {
        setLoading(true);
        const { cardholdername, saveAddress, ...shippingAddress } = data;
        if(!stripe || !elements ) return; //kart işleme hazırl değil
        try {
            
            const cardElement =elements.getElement(CardNumberElement);
            const paymentResult = await stripe.confirmCardPayment(basket?.clientSecret!,{
                payment_method:{
                    card:cardElement!,
                    billing_details:{
                        name:cardholdername
                    }
                }
            });
            console.log(paymentResult);

            if(paymentResult.paymentIntent?.status ==='succeeded')
            {
                const orderNumber = await agent.Orders.create({ saveAddress, shippingAddress });
                setOrderNumber(orderNumber);
                setPaymentSucceeded(true);
                setPaymentMessage('Teşekkürler ödemeniz başarılı şekilde gerçekleştirildi');
                setActiveStep(activeStep + 1)
                dispatch(clearBasket());
                setLoading(false);
            }
            else{
                setPaymentMessage(paymentResult.error?.message!);
                setPaymentSucceeded(false);
                setLoading(false);
                setActiveStep(activeStep+1);
            }
            
        } catch (error:any) {
            console.log(error);
            setLoading(false);
        }
    }


    const handleNext = async (data: FieldValues) => {
 
        if (activeStep === steps.length - 1) {

            await sumbitOrder(data);           
        }
        else {
            setActiveStep(activeStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(activeStep - 1);
    };

    function sumbitDisabled():boolean{
        if(activeStep===steps.length-1){
            return    !cardComplete.cardCvc 
                   || !cardComplete.cardExpiry 
                   || !cardComplete.cardNumber 
                   || !methods.formState.isValid
        }
        else{
            return !methods.formState.isValid
        }
    }

    return (
        <FormProvider {...methods}>
            <Paper variant="outlined" sx={{ my: { xs: 3, md: 6 }, p: { xs: 2, md: 3 } }}>
                <Typography component="h1" variant="h4" align="center">
                    Ödeme Adımı
                </Typography>
                <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
                    {steps.map((label: any) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
                <>
                    {activeStep === steps.length ? (
                        <>
                            <Typography variant="h5" gutterBottom>
                               {paymentMessage}
                            </Typography>
                            {paymentSucceeded ?(
                                 <Typography variant="subtitle1">
                                 Sipariş numaranız #{orderNumber}. Siparişinizi e-posta ile gönderdik
                                 onay ve siparişiniz tamamlandığında size bir güncelleme gönderecek
                                 sevk edildi.
                             </Typography>

                            ): (
                                <Button variant="contained" onClick={handleBack}> Geri Dön tekrar dene</Button>
                            )}
                           
                        </>
                    ) : (
                        <form onSubmit={methods.handleSubmit(handleNext)}>
                            {getStepContent(activeStep)}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                {activeStep !== 0 && (
                                    <Button onClick={handleBack} sx={{ mt: 3, ml: 1 }}>
                                        Önce
                                    </Button>
                                )}
                                    <LoadingButton
                                    loading={loading }
                                    disabled={sumbitDisabled()}
                                    variant="contained"
                                    type="submit"
                                    sx={{ mt: 3, ml: 1 }}
                                >
                                    {activeStep === steps.length - 1 ? 'Sipariş Ver' : 'Sonra'}
                                </LoadingButton>
                            </Box>
                        </form>
                    )}
                </>
            </Paper>
        </FormProvider>
    );
}


﻿import { Box, Button, Paper, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { useState } from "react";
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import AddressForm from "./AddressForm";
import PaymentForm from "./PaymentForm";
import Review from "./Review";
import { yupResolver } from '@hookform/resolvers/yup';
import { validationSchema } from "./checkoutValidation";
import agent from "../../app/api/agent";
import { useAppDispatch } from "../../app/store/configureStore";
import { clearBasket } from "../basket/basketSlice";
import { LoadingButton } from "@mui/lab";

const steps = ['Gönderim adresi', 'Siparişinizi inceleyin', 'Ödeme ayrıntıları'];

function getStepContent(step: number) {
    switch (step) {
        case 0:
            return <AddressForm />;
        case 1:
            return <Review />;
        case 2:
            return <PaymentForm />;
        default:
            throw new Error('Bilinmeyen Hata!...');
    }
}

export default function CheckoutPage() {

    const [activeStep, setActiveStep] = useState(0);
    const [orderNumber, setOrderNumber] = useState(0);
    const [loading, setLoading] = useState(false);
    const dispatch = useAppDispatch();


    const currentValidationSchema = validationSchema[activeStep];

    const methods = useForm({
        mode: 'onTouched',
        resolver: yupResolver(currentValidationSchema)
    });
    const handleNext = async (data: FieldValues) => {

        const { nameOncard, saveAddress, ...shippingAddress } = data;
        if (activeStep === steps.length - 1) {
            setLoading(true);
            try {
                const orderNumber = await agent.Orders.create({ saveAddress, shippingAddress });
                setOrderNumber(orderNumber);
                setActiveStep(activeStep + 1)
                dispatch(clearBasket());
                setLoading(false);
            } catch (error: any) {
                console.log(error);
                setLoading(false);
            }
        }
        else {
            setActiveStep(activeStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(activeStep - 1);
    };

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
                                Siparişiniz için teşekkür ederiz.
                            </Typography>
                            <Typography variant="subtitle1">
                                Sipariş numaranız #{orderNumber}. Siparişinizi e-posta ile gönderdik
                                onay ve siparişiniz tamamlandığında size bir güncelleme gönderecek
                                sevk edildi.
                            </Typography>
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
                                    disabled={!methods.formState.isValid}
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